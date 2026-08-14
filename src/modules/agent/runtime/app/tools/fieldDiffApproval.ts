import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import { flattenSegments, reassembleValue } from '#blokkli/editor/helpers/diff'

export type RejectedSegment = {
  tag: string
  beforeHtml: string
  afterHtml: string
  status: 'matched' | 'inserted' | 'deleted'
  reasonForRejection: string
}

export type FieldRejection = {
  reasonForRejection: string
  /**
   * Present when the user evaluated a segmented field chunk-by-chunk. When
   * `accepted > 0` the field was updated with a hybrid value; when
   * `accepted === 0` every chunk was rejected and the field stayed at its
   * original value.
   */
  partial?: {
    accepted: number
    total: number
    rejectedSegments: RejectedSegment[]
  }
}

/** Map of paragraph UUID → field name → rejection details. */
export type RejectedByUser = Record<string, Record<string, FieldRejection>>

/**
 * A field reference (uuid + field name) that was dropped before applying,
 * because the paragraph or the field does not exist. Reported back to the agent
 * so it can correct the reference instead of silently getting no change.
 */
export type SkippedField = {
  uuid: string
  fieldName: string
  reason: string
}

/**
 * Build the agent-facing note listing skipped field references. Returns
 * undefined when nothing was skipped. Shared by `update_text_fields` and
 * `delegate_text_rewrite`, which both drop references that don't resolve.
 */
export function skippedFieldsMessage(
  skipped: SkippedField[],
): string | undefined {
  if (!skipped.length) return undefined
  const list = skipped
    .map((s) => `"${s.uuid}" ${s.fieldName} (${s.reason})`)
    .join(', ')
  return `Skipped ${skipped.length} field update(s) for references that don't exist: ${list}. Use get_page_structure or find_paragraphs to get valid paragraph UUIDs and field names.`
}

/**
 * Append a secondary note to an agent message, tolerating undefined on either
 * side. Used to add the skipped-fields note to every terminal `agentMessage`.
 */
export function appendAgentNote(
  message: string | undefined,
  note: string | undefined,
): string | undefined {
  if (!note) return message
  if (!message) return note
  return `${message}\n\n${note}`
}

export type DecidedUpdate = {
  itemId: number
  uuid: string
  fieldName: string
  fieldValue: string
}

/** A field whose suggested value the user manually revised before applying. */
export type EditedField = {
  itemId: number
  uuid: string
  fieldName: string
  /** The value the user wrote in place of the suggestion. */
  value: string
}

export type FieldDecisionResult = {
  /**
   * One entry per accepted item, with the value that should be written. For
   * segmented items this is the reassembled hybrid (accepted chunks + original
   * chunks for rejected ones); for unsegmented items it's `item.value`.
   */
  updates: DecidedUpdate[]
  rejectedByUser: RejectedByUser
  /**
   * Number of accepted toggle units across the whole batch. For unsegmented
   * fields this is "field accepted" / "field rejected"; for segmented fields
   * each changed chunk counts as one unit.
   */
  acceptedCount: number
  /** Total number of toggle units the user could have selected. */
  totalCount: number
  /**
   * Accepted fields whose value the user manually revised in the approval UI.
   * Their revised value is also part of `updates`; this list exists so the
   * caller can report the revisions back to the agent as calibration feedback.
   */
  editedFields: EditedField[]
}

/**
 * Walk the approval items and decide, per field, what gets written and what
 * gets reported as rejected. Pure: does no IO and does not depend on the
 * adapter. The caller picks the mutation strategy (entity vs. batch update,
 * translation import, …).
 *
 * `selected` and `reasons` are keyed by `ApprovalUnit.key` — the stringified
 * item id for unsegmented items, `${itemId}:${segmentId}` for segmented.
 *
 * `edited` holds manually revised values keyed by stringified item id (see
 * `DiffApplyPayload`). An edited item always resolves as a single whole-field
 * unit with the revised value — any segments on the item are ignored, matching
 * the collapse the approval UI performed.
 */
export function decideFieldUpdates(
  items: ApprovalItem[],
  selected: Record<string, boolean>,
  reasons: Record<string, string>,
  edited: Record<string, string> = {},
): FieldDecisionResult {
  const rejectedByUser: RejectedByUser = {}
  const updates: DecidedUpdate[] = []
  const editedFields: EditedField[] = []
  let acceptedCount = 0
  let totalCount = 0

  for (const item of items) {
    const editedValue = edited[String(item.id)]
    if (editedValue !== undefined) {
      totalCount++
      const key = String(item.id)
      const isAccepted = selected[key] !== false

      if (isAccepted) {
        acceptedCount++
        updates.push({
          itemId: item.id,
          uuid: item.uuid,
          fieldName: item.fieldName,
          fieldValue: editedValue,
        })
        editedFields.push({
          itemId: item.id,
          uuid: item.uuid,
          fieldName: item.fieldName,
          value: editedValue,
        })
      } else {
        // Drafted, then discarded: reported as a plain rejection.
        const fields = rejectedByUser[item.uuid] ?? {}
        fields[item.fieldName] = {
          reasonForRejection: reasons[key] || '',
        }
        rejectedByUser[item.uuid] = fields
      }
      continue
    }

    if (item.segments) {
      const atoms = flattenSegments(item.segments).filter((s) => s.changed)
      totalCount += atoms.length

      const acceptedById: Record<string, boolean> = {}
      const rejectedSegments: RejectedSegment[] = []
      let accepted = 0

      for (const atom of atoms) {
        const key = `${item.id}:${atom.id}`
        const isAccepted = selected[key] !== false
        acceptedById[atom.id] = isAccepted
        if (isAccepted) {
          accepted++
        } else {
          rejectedSegments.push({
            tag: atom.tag,
            beforeHtml: atom.beforeHtml,
            afterHtml: atom.afterHtml,
            status: atom.status,
            reasonForRejection: reasons[key] || '',
          })
        }
      }

      acceptedCount += accepted

      if (accepted > 0) {
        // Reassembly re-serializes the whole field through the DOM, which
        // rewrites content the user never touched (entities decode, `<br />`
        // becomes `<br>`). It is only worth that cost for a genuine partial
        // accept — when everything was accepted the proposed value already IS
        // the answer, byte for byte.
        const fieldValue =
          accepted === atoms.length
            ? item.value
            : reassembleValue(item.segments, acceptedById)
        updates.push({
          itemId: item.id,
          uuid: item.uuid,
          fieldName: item.fieldName,
          fieldValue,
        })
      }

      if (rejectedSegments.length > 0) {
        const fields = rejectedByUser[item.uuid] ?? {}
        fields[item.fieldName] = {
          reasonForRejection: '',
          partial: {
            accepted,
            total: atoms.length,
            rejectedSegments,
          },
        }
        rejectedByUser[item.uuid] = fields
      }
    } else {
      totalCount++
      const key = String(item.id)
      const isAccepted = selected[key] !== false

      if (isAccepted) {
        acceptedCount++
        updates.push({
          itemId: item.id,
          uuid: item.uuid,
          fieldName: item.fieldName,
          fieldValue: item.value,
        })
      } else {
        const fields = rejectedByUser[item.uuid] ?? {}
        fields[item.fieldName] = {
          reasonForRejection: reasons[key] || '',
        }
        rejectedByUser[item.uuid] = fields
      }
    }
  }

  return { updates, rejectedByUser, acceptedCount, totalCount, editedFields }
}

export type FieldDiffApplyResult = FieldDecisionResult & {
  label: string
  /**
   * The value that was actually written for each accepted item, keyed by
   * `ApprovalItem.id`. Used by the caller to build the `_details` panel
   * (agent-facing audit log).
   */
  appliedByItemId: Record<number, string>
}

/**
 * Apply the user's accept/reject decisions for a batch of field diffs through
 * `updateFieldValueBatched`. Shared by `update_text_fields` and
 * `delegate_text_rewrite`. The translation tool calls `decideFieldUpdates`
 * directly because it imports through a different adapter method.
 */
export async function applyFieldDiffs(
  app: BlokkliApp,
  adapter: FullBlokkliAdapter<any>,
  items: ApprovalItem[],
  selected: Record<string, boolean>,
  reasons: Record<string, string>,
  edited: Record<string, string> = {},
): Promise<FieldDiffApplyResult> {
  const { $t, state, context } = app
  const entityUuid = context.value.entityUuid

  const decision = decideFieldUpdates(items, selected, reasons, edited)

  const batchItems: Array<{
    uuid: string
    fieldName: string
    fieldValue: string
  }> = []
  const entityItems: Array<{ fieldName: string; fieldValue: string }> = []
  const appliedByItemId: Record<number, string> = {}

  for (const update of decision.updates) {
    appliedByItemId[update.itemId] = update.fieldValue
    if (update.uuid === entityUuid) {
      entityItems.push({
        fieldName: update.fieldName,
        fieldValue: update.fieldValue,
      })
    } else {
      batchItems.push({
        uuid: update.uuid,
        fieldName: update.fieldName,
        fieldValue: update.fieldValue,
      })
    }
  }

  await state.mutateWithLoadingState(() =>
    adapter.updateFieldValueBatched!({ items: batchItems, entityItems }),
  )

  const label =
    decision.acceptedCount === decision.totalCount
      ? $t(
          'aiAgentBatchRewriteAllApplied',
          'All @count changes applied',
        ).replace('@count', String(decision.acceptedCount))
      : $t(
          'aiAgentBatchRewriteSomeApplied',
          '@applied of @total changes applied',
        )
          .replace('@applied', String(decision.acceptedCount))
          .replace('@total', String(decision.totalCount))

  return {
    ...decision,
    label,
    appliedByItemId,
  }
}

/**
 * Inline guidance the agent should follow when ANY field in this result came
 * back with `partial` set AND at least one chunk was accepted — i.e. the
 * field was updated with a hybrid value. Returns undefined when there were
 * no such hybrids.
 *
 * Scoping a follow-up to the rejected chunks (instead of rewriting the field
 * whole) is non-obvious — without this hint the model tends to re-propose
 * the entire field and clobber the accepted chunks. The guidance only
 * appears when a hybrid was actually written, so it costs nothing on the
 * normal "all accepted" or "all rejected" paths.
 */
export function partialRejectionGuidance(
  rejected: RejectedByUser,
): string | undefined {
  const partials: Array<{ uuid: string; fieldName: string }> = []
  for (const [uuid, fields] of Object.entries(rejected)) {
    for (const [fieldName, v] of Object.entries(fields)) {
      if (v.partial && v.partial.accepted > 0) {
        partials.push({ uuid, fieldName })
      }
    }
  }
  if (partials.length === 0) return undefined

  const fieldList = partials
    .map((p) => `"${p.fieldName}" (paragraph ${p.uuid})`)
    .join(', ')
  const noun = partials.length === 1 ? 'This field was' : 'These fields were'
  return `${noun} updated with a hybrid value — accepted chunks plus the original content of the rejected ones: ${fieldList}. If you follow up on the rejected chunks, scope your change to those chunks only — use update_text_fields patch mode (operations) with search matching the rejected chunk's original content. Do NOT re-rewrite the whole field; the accepted chunks must stay byte-for-byte identical.`
}

/**
 * The agent-facing note describing fields the user manually revised before
 * applying. Returns undefined when nothing was edited.
 *
 * A manual revision is the strongest calibration signal the approval flow
 * produces — the user showed exactly what they wanted instead — so the note
 * quotes the revised value and tells the agent to treat it as wording/style
 * feedback for the rest of the session.
 */
export function manualEditsMessage(
  editedFields: EditedField[],
): string | undefined {
  if (editedFields.length === 0) return undefined

  const truncate = (value: string): string =>
    value.length > 500 ? value.slice(0, 500) + '…' : value

  if (editedFields.length === 1) {
    const e = editedFields[0]!
    return `The user manually revised your suggested text for "${e.fieldName}" (paragraph ${e.uuid}) before applying it. They wrote this instead:\n${truncate(e.value)}\nTreat this as feedback on wording and style — calibrate future suggestions accordingly.`
  }

  const list = editedFields
    .map(
      (e) => `- "${e.fieldName}" (paragraph ${e.uuid}):\n${truncate(e.value)}`,
    )
    .join('\n')
  return `The user manually revised your suggested text for ${editedFields.length} fields before applying. What they wrote instead:\n${list}\nTreat this as feedback on wording and style — calibrate future suggestions accordingly.`
}

/**
 * The follow-up instruction to give the agent when the user rejected fields
 * or chunks without a reason. Returns undefined when every rejection had a
 * reason (or there were none).
 *
 * Partial rejections are surfaced at chunk granularity so the agent knows to
 * offer alternatives for the specific paragraph or list item, not the whole
 * field.
 */
export function rejectedWithoutReasonMessage(
  rejected: RejectedByUser,
): string | undefined {
  type Entry =
    | { kind: 'field'; uuid: string; fieldName: string }
    | {
        kind: 'segment'
        uuid: string
        fieldName: string
        tag: string
        status: 'matched' | 'inserted' | 'deleted'
      }

  const entries: Entry[] = []
  for (const [uuid, fields] of Object.entries(rejected)) {
    for (const [fieldName, v] of Object.entries(fields)) {
      if (v.partial) {
        for (const seg of v.partial.rejectedSegments) {
          if (!seg.reasonForRejection) {
            entries.push({
              kind: 'segment',
              uuid,
              fieldName,
              tag: seg.tag,
              status: seg.status,
            })
          }
        }
      } else if (!v.reasonForRejection) {
        entries.push({ kind: 'field', uuid, fieldName })
      }
    }
  }

  if (entries.length === 0) return undefined

  const describe = (e: Entry): string =>
    e.kind === 'segment'
      ? `a <${e.tag}> ${e.status === 'matched' ? 'change' : e.status === 'inserted' ? 'insertion' : 'deletion'} in "${e.fieldName}" of paragraph ${e.uuid}`
      : `"${e.fieldName}" of paragraph ${e.uuid}`

  if (entries.length === 1) {
    const it = entries[0]!
    if (it.kind === 'segment') {
      return `The user rejected ${describe(it)} without a reason. Use the ask_question tool to present 2 or more alternative wordings for that specific chunk — do not rewrite the whole field.`
    }
    return `The user rejected ${describe(it)} without a reason. Use the ask_question tool to present the user with 2 or more alternative texts.`
  }
  if (entries.length === 2) {
    return `The user rejected ${describe(entries[0]!)} and ${describe(entries[1]!)} without a reason. Use the ask_question tool to present 2 or more alternative texts for each.`
  }
  return 'Some changes were rejected without a reason. Ask the user what they would like to change instead.'
}
