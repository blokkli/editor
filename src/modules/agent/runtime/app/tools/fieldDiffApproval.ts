import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { FullBlokkliAdapter } from '#blokkli/editor/adapter'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'

/** Map of rejected paragraph UUID → field name → rejection details. */
export type RejectedByUser = Record<
  string,
  Record<string, { reasonForRejection: string }>
>

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

export type FieldDiffApplyResult = {
  acceptedCount: number
  rejectedByUser: RejectedByUser
  label: string
}

/**
 * Apply the user's accept/reject decisions for a batch of field diffs: split
 * the accepted items into entity-level vs block-level updates, run the batched
 * mutation, and return the accepted count, rejection map, and a summary label.
 *
 * Shared by `update_text_fields` and `delegate_text_rewrite`, which both render
 * the same diff-approval UI and report the same accepted/rejected outcome. Each
 * caller layers its own `agentMessage` / details / usage on top of the result.
 */
export async function applyFieldDiffs(
  app: BlokkliApp,
  adapter: FullBlokkliAdapter<any>,
  items: ApprovalItem[],
  selected: Record<number, boolean>,
  reasons: Record<number, string>,
): Promise<FieldDiffApplyResult> {
  const { $t, state, context } = app
  const entityUuid = context.value.entityUuid

  const rejectedByUser: RejectedByUser = {}
  const batchItems: Array<{
    uuid: string
    fieldName: string
    fieldValue: string
  }> = []
  const entityItems: Array<{ fieldName: string; fieldValue: string }> = []

  for (const item of items) {
    if (!selected[item.id]) {
      const fields = rejectedByUser[item.uuid] ?? {}
      fields[item.fieldName] = { reasonForRejection: reasons[item.id] || '' }
      rejectedByUser[item.uuid] = fields
      continue
    }

    if (item.uuid === entityUuid) {
      entityItems.push({ fieldName: item.fieldName, fieldValue: item.value })
    } else {
      batchItems.push({
        uuid: item.uuid,
        fieldName: item.fieldName,
        fieldValue: item.value,
      })
    }
  }

  await state.mutateWithLoadingState(() =>
    adapter.updateFieldValueBatched!({ items: batchItems, entityItems }),
  )

  const acceptedCount = batchItems.length + entityItems.length

  const label =
    acceptedCount === items.length
      ? $t('aiAgentBatchRewriteAllApplied', 'All @count changes applied').replace(
          '@count',
          String(acceptedCount),
        )
      : $t(
          'aiAgentBatchRewriteSomeApplied',
          '@applied of @total changes applied',
        )
          .replace('@applied', String(acceptedCount))
          .replace('@total', String(items.length))

  return { acceptedCount, rejectedByUser, label }
}

/**
 * The follow-up instruction to give the agent when the user rejected fields
 * without a reason. Returns undefined when every rejection had a reason (or
 * there were none).
 */
export function rejectedWithoutReasonMessage(
  rejectedByUser: RejectedByUser,
): string | undefined {
  const rejected: Array<{ uuid: string; fieldName: string }> = []
  for (const [uuid, fields] of Object.entries(rejectedByUser)) {
    for (const [fieldName, v] of Object.entries(fields)) {
      if (!v?.reasonForRejection) rejected.push({ uuid, fieldName })
    }
  }

  if (rejected.length === 1 || rejected.length === 2) {
    const fieldList = rejected
      .map((r) => `"${r.fieldName}" of paragraph ${r.uuid}`)
      .join(' and ')
    return `The user rejected ${fieldList} without a reason. Use the ask_question tool to present the user with 2 or more alternative texts for each rejected field.`
  }
  if (rejected.length > 2) {
    return 'Some changes were rejected without a reason. Ask the user what they would like to change instead.'
  }
  return undefined
}
