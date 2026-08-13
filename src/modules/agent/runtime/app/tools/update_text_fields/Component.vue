<template>
  <DiffApproval
    v-if="items.length > 0 && params.requireApproval !== false"
    :items="items"
    show-reason
    editable
    @apply="applySelected"
    @cancel="rejectAll"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, ref, onMounted } from '#imports'
import { DiffApproval } from '#blokkli/editor/components'
import { splitIntoSegments } from '#blokkli/editor/helpers/diff'
import type {
  McpToolContext,
  ComponentToolResult,
} from '#blokkli/agent/app/types'
import type { ComponentParams, BatchRewriteResult } from './index'
import {
  applyOperations,
  readAgentFieldValue,
  resolveHost as resolveBlockHost,
} from '../helpers'
import {
  applyFieldDiffs,
  rejectedWithoutReasonMessage,
  partialRejectionGuidance,
  manualEditsMessage,
  skippedFieldsMessage,
  appendAgentNote,
  type RejectedByUser,
} from '../fieldDiffApproval'
import type {
  ApprovalItem,
  DiffApplyPayload,
} from '#blokkli/editor/components/DiffApproval/types'
import type { FieldDiffDetailItem } from '../../components/FieldDiffDetails/index.vue'

const props = defineProps<{
  context: McpToolContext
  params: ComponentParams
}>()

const emit = defineEmits<{
  (e: 'done', result: ComponentToolResult<BatchRewriteResult>): void
}>()

const blokkli = useBlokkli()
const { $t, state, types } = blokkli

const isApplying = ref(false)

// References that `execute` dropped because the paragraph/field doesn't exist.
// Appended to every terminal agentMessage so the agent learns what was skipped.
const skippedNote = skippedFieldsMessage(props.params.skipped)

function emitDone(result: ComponentToolResult<BatchRewriteResult>): void {
  emit('done', {
    ...result,
    agentMessage: appendAgentNote(result.agentMessage, skippedNote),
  })
}

onMounted(() => {
  // No applicable changes (e.g. the proposed values already match the current
  // field values, so every item was filtered out). DiffApproval renders no
  // toolbar — and therefore no cancel button — for an empty item list, so emit
  // immediately to avoid a stuck state with no way out.
  if (items.length === 0) {
    emitDone({
      acceptedCount: 0,
      rejectedByUser: {},
      label: $t('aiAgentBatchRewriteNoChanges', 'No changes detected'),
      agentMessage:
        'No changes were applied — the requested values already matched the current field values.',
    })
    return
  }

  if (props.params.requireApproval === false) {
    applySelected({
      selected: Object.fromEntries(items.map((item) => [item.id, true])),
      reasons: Object.fromEntries(items.map((item) => [item.id, ''])),
      edited: {},
    })
  }
})

function resolveHost(
  uuid: string,
): { entityType: string; bundle: string } | null {
  return resolveBlockHost(blokkli, uuid)
}

function resolveFieldLabel(uuid: string, fieldName: string): string {
  const host = resolveHost(uuid)
  if (!host) return fieldName
  const config = types.editableFieldConfig.forName(
    host.entityType,
    host.bundle,
    fieldName,
  )
  return config?.label || fieldName
}

function getFieldType(
  uuid: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const host = resolveHost(uuid)
  if (!host) return null
  const cfg = types.editableFieldConfig.forName(
    host.entityType,
    host.bundle,
    fieldName,
  )
  if (!cfg || cfg.type === 'table') return null
  // 'frame' is a markup variant — chunkable like any other rich-text field.
  return cfg.type === 'plain' ? 'plain' : 'markup'
}

/**
 * The field's current STORED value — the basis for patch operations, the diff,
 * and the reassembled value a partial acceptance writes back.
 *
 * Must not read the DOM: the rendered value carries whatever the backend's
 * filters injected, and every one of those three consumers ends up persisted.
 * Reading raw also means fields with no directive-bound element (declared purely
 * via `propsFieldMapping`) resolve, where the old DOM lookup returned null and
 * silently dropped their operations.
 */
function getCurrentValue(uuid: string, fieldName: string): string | null {
  const host = resolveHost(uuid)
  if (!host) return null
  const read = readAgentFieldValue(
    blokkli,
    host.entityType,
    uuid,
    host.bundle,
    fieldName,
  )
  return read ? read.value : null
}

let idCounter = 0
const beforeValues = new Map<number, string>()

type DraftItem = Omit<ApprovalItem, 'segments'> & {
  fieldType: 'plain' | 'markup'
}

function buildItems(): DraftItem[] {
  const result: DraftItem[] = []

  const pushItem = (
    uuid: string,
    fieldName: string,
    value: string,
    fieldType: 'plain' | 'markup',
  ) => {
    result.push({
      id: idCounter++,
      uuid,
      fieldName,
      fieldLabel: resolveFieldLabel(uuid, fieldName),
      value,
      fieldType,
    })
  }

  // Process full-value replacements from `updates`.
  if (props.params.updates) {
    for (const { uuid, fieldName, value } of props.params.updates) {
      const fieldType = getFieldType(uuid, fieldName)
      if (fieldType === null) continue
      pushItem(uuid, fieldName, value, fieldType)
    }
  }

  // Process patch operations — group by uuid+fieldName, apply to current value.
  if (props.params.operations?.length) {
    const grouped = new Map<
      string,
      {
        uuid: string
        fieldName: string
        ops: Array<{ search: string; replace: string; selector?: boolean }>
      }
    >()
    for (const op of props.params.operations) {
      const key = `${op.uuid}::${op.fieldName}`
      let entry = grouped.get(key)
      if (!entry) {
        entry = { uuid: op.uuid, fieldName: op.fieldName, ops: [] }
        grouped.set(key, entry)
      }
      entry.ops.push({
        search: op.search,
        replace: op.replace,
        selector: op.selector,
      })
    }

    for (const { uuid, fieldName, ops } of grouped.values()) {
      const current = getCurrentValue(uuid, fieldName)
      if (current === null) continue
      const fieldType = getFieldType(uuid, fieldName)
      if (fieldType === null) continue

      const newValue = applyOperations(current, ops)
      if (newValue === current) continue

      pushItem(uuid, fieldName, newValue, fieldType)
    }
  }

  return result
}

const items: ApprovalItem[] = []
for (const draft of buildItems()) {
  const current = getCurrentValue(draft.uuid, draft.fieldName)
  if (current !== null) {
    beforeValues.set(draft.id, current)
    if (current === draft.value) continue
  }
  const segments =
    current !== null
      ? (splitIntoSegments(current, draft.value, draft.fieldType) ?? undefined)
      : undefined
  items.push({
    id: draft.id,
    uuid: draft.uuid,
    fieldName: draft.fieldName,
    fieldLabel: draft.fieldLabel,
    value: draft.value,
    segments,
  })
}

async function applySelected(data: DiffApplyPayload) {
  const { selected, reasons, edited } = data

  isApplying.value = true

  const {
    acceptedCount,
    rejectedByUser,
    label,
    appliedByItemId,
    editedFields,
  } = await applyFieldDiffs(
    blokkli,
    props.context.adapter,
    items,
    selected,
    reasons,
    edited,
  )

  // Capture before/after diffs for the details panel. For segmented items the
  // "after" is the reassembled hybrid we actually wrote, not the agent's
  // proposed value.
  const _details: FieldDiffDetailItem[] = items
    .filter((item) => appliedByItemId[item.id] !== undefined)
    .map((item) => ({
      fieldLabel: item.fieldLabel,
      before: beforeValues.get(item.id) || '',
      after: appliedByItemId[item.id]!,
    }))

  const editedByUser: Record<string, Record<string, { value: string }>> = {}
  for (const e of editedFields) {
    const fields = editedByUser[e.uuid] ?? {}
    fields[e.fieldName] = { value: e.value }
    editedByUser[e.uuid] = fields
  }

  emitDone({
    acceptedCount,
    rejectedByUser,
    editedByUser: editedFields.length > 0 ? editedByUser : undefined,
    label,
    agentMessage: appendAgentNote(
      appendAgentNote(
        partialRejectionGuidance(rejectedByUser),
        rejectedWithoutReasonMessage(rejectedByUser),
      ),
      manualEditsMessage(editedFields),
    ),
    historyIndex: state.currentMutationIndex.value,
    _details,
  })
}

async function rejectAll() {
  const rejectedByUser: RejectedByUser = {}
  for (const item of items) {
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = { reasonForRejection: '' }
    rejectedByUser[item.uuid] = fields
  }

  emitDone({
    acceptedCount: 0,
    rejectedByUser,
    label: $t('aiAgentBatchRewriteAllRejected', 'All changes rejected'),
    agentMessage:
      'All changes were rejected by the user. Ask the user what they would like to change instead.',
  })
}
</script>
