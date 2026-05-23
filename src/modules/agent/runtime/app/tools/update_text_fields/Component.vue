<template>
  <DiffApproval
    v-if="items.length > 0 && params.requireApproval !== false"
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
import {
  applyFieldDiffs,
  rejectedWithoutReasonMessage,
} from '../fieldDiffApproval'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import type { FieldDiffDetailItem } from '../../components/FieldDiffDetails/index.vue'

const props = defineProps<{
  context: McpToolContext
  params: BatchRewriteParams
}>()

const emit = defineEmits<{
  (e: 'done', result: ComponentToolResult<BatchRewriteResult>): void
}>()

const blokkli = useBlokkli()
const { $t, state, types, directive } = blokkli

const isApplying = ref(false)

onMounted(() => {
  // No applicable changes (e.g. the proposed values already match the current
  // field values, so every item was filtered out). DiffApproval renders no
  // toolbar — and therefore no cancel button — for an empty item list, so emit
  // immediately to avoid a stuck state with no way out.
  if (items.length === 0) {
    emit('done', {
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

  isApplying.value = true

  const { acceptedCount, rejectedByUser, label } = await applyFieldDiffs(
    blokkli,
    props.context.adapter,
    items,
    selected,
    reasons,
  )

  // Capture before/after diffs for the details panel.
  const _details: FieldDiffDetailItem[] = items
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
    agentMessage: rejectedWithoutReasonMessage(rejectedByUser),
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
