<template>
  <DiffApproval
    v-if="params.requireApproval !== false"
    :items="items"
    show-reason
    @apply="applySelected"
    @cancel="rejectAll"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, ref, onMounted, onBeforeUnmount } from '#imports'
import { DiffApproval } from '#blokkli/editor/components'
import type {
  McpToolContext,
  ComponentToolResult,
} from '#blokkli/agent/app/types'
import type { BatchRewriteParams, BatchRewriteResult } from './index'
import { applyOperations, resolveHost as resolveBlockHost } from '../helpers'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'

const props = defineProps<{
  context: McpToolContext
  params: BatchRewriteParams
}>()

export type BatchRewriteDetailItem = {
  fieldLabel: string
  before: string
  after: string
}

const emit = defineEmits<{
  (e: 'done', result: ComponentToolResult<BatchRewriteResult>): void
}>()

const blokkli = useBlokkli()
const { $t, state, context: editorContext, types, directive } = blokkli

const isApplying = ref(false)

onMounted(() => {
  if (props.params.requireApproval === false) {
    applySelected({
      selected: Object.fromEntries(items.map((item) => [item.id, true])),
      reasons: Object.fromEntries(items.map((item) => [item.id, ''])),
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

function getCurrentValue(uuid: string, fieldName: string): string | null {
  const host = resolveHost(uuid)
  if (!host) return null
  const el = directive.findEditableElement(fieldName, {
    type: host.entityType,
    bundle: host.bundle,
    uuid,
  })
  if (!el) return null
  const cfg = types.editableFieldConfig.forName(
    host.entityType,
    host.bundle,
    fieldName,
  )
  if (!cfg || cfg.type === 'table') return null
  return cfg.type === 'plain' ? el.textContent || '' : el.innerHTML
}

let idCounter = 0
const beforeValues = new Map<number, string>()

function buildItems(): ApprovalItem[] {
  const result: ApprovalItem[] = []

  // Process full-value replacements from `uuids`.
  if (props.params.uuids) {
    for (const [uuid, fields] of Object.entries(props.params.uuids)) {
      for (const [fieldName, value] of Object.entries(fields)) {
        result.push({
          id: idCounter++,
          uuid,
          fieldName,
          fieldLabel: resolveFieldLabel(uuid, fieldName),
          value,
        })
      }
    }
  }

  // Process patch operations — group by uuid+fieldName, apply to current value.
  if (props.params.operations?.length) {
    // Group operations by uuid+fieldName.
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

      const newValue = applyOperations(current, ops)
      if (newValue === current) continue

      result.push({
        id: idCounter++,
        uuid,
        fieldName,
        fieldLabel: resolveFieldLabel(uuid, fieldName),
        value: newValue,
      })
    }
  }

  return result
}

const items: ApprovalItem[] = buildItems().filter((item) => {
  const current = getCurrentValue(item.uuid, item.fieldName)
  if (current !== null) {
    beforeValues.set(item.id, current)
  }
  return current === null || current !== item.value
})

async function applySelected(data: {
  selected: Record<number, boolean>
  reasons: Record<number, string>
}) {
  const { selected, reasons } = data
  const rejectedByUser: Record<
    string,
    Record<string, { reasonForRejection: string }>
  > = {}

  // Apply all selected changes via the adapter in a single batch.
  const entityUuid = editorContext.value.entityUuid

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
      entityItems.push({
        fieldName: item.fieldName,
        fieldValue: item.value,
      })
    } else {
      batchItems.push({
        uuid: item.uuid,
        fieldName: item.fieldName,
        fieldValue: item.value,
      })
    }
  }

  isApplying.value = true

  await state.mutateWithLoadingState(() =>
    props.context.adapter.updateFieldValueBatched!({
      items: batchItems,
      entityItems,
    }),
  )

  const acceptedCount = batchItems.length + entityItems.length

  const label =
    acceptedCount === items.length
      ? $t(
          'aiAgentBatchRewriteAllApplied',
          'All @count changes applied',
        ).replace('@count', String(acceptedCount))
      : $t(
          'aiAgentBatchRewriteSomeApplied',
          '@applied of @total changes applied',
        )
          .replace('@applied', String(acceptedCount))
          .replace('@total', String(items.length))

  // Collect rejected fields without a reason.
  const rejectedWithoutReason: Array<{ uuid: string; fieldName: string }> = []
  for (const [uuid, fields] of Object.entries(rejectedByUser)) {
    for (const [fieldName, v] of Object.entries(fields)) {
      if (!v?.reasonForRejection) {
        rejectedWithoutReason.push({ uuid, fieldName })
      }
    }
  }

  let agentMessage: string | undefined
  if (
    rejectedWithoutReason.length === 1 ||
    rejectedWithoutReason.length === 2
  ) {
    const fieldList = rejectedWithoutReason
      .map((r) => `"${r.fieldName}" of paragraph ${r.uuid}`)
      .join(' and ')
    agentMessage = `The user rejected ${fieldList} without a reason. Use the ask_question tool to present the user with 2 or more alternative texts for each rejected field.`
  } else if (rejectedWithoutReason.length > 2) {
    agentMessage =
      'Some changes were rejected without a reason. Ask the user what they would like to change instead.'
  }

  // Capture before/after diffs for the details panel.
  const _details: BatchRewriteDetailItem[] = items
    .filter((item) => selected[item.id])
    .map((item) => ({
      fieldLabel: item.fieldLabel,
      before: beforeValues.get(item.id) || '',
      after: item.value,
    }))

  emit('done', {
    acceptedCount,
    rejectedByUser,
    label,
    agentMessage,
    historyIndex: state.currentMutationIndex.value,
    _details,
  })
}

onBeforeUnmount(() => {
  state.flushDirty()
})

async function rejectAll() {
  await state.flushDirty()

  const rejectedByUser: Record<
    string,
    Record<string, { reasonForRejection: string }>
  > = {}
  for (const item of items) {
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = { reasonForRejection: '' }
    rejectedByUser[item.uuid] = fields
  }

  emit('done', {
    acceptedCount: 0,
    rejectedByUser,
    label: $t('aiAgentBatchRewriteAllRejected', 'All changes rejected'),
    agentMessage:
      'All changes were rejected by the user. Ask the user what they would like to change instead.',
  })
}
</script>
