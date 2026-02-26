<template>
  <ToolCard
    v-if="params.requireApproval !== false"
    icon="bk_mdi_edit"
    :title="
      $t('aiAgentBatchRewriteTitle', 'Rewrite @count fields').replace(
        '@count',
        String(items.length),
      )
    "
    @cancel="rejectAll"
  >
    <div v-if="!isApplying">
      <div class="bk-batch-rewrite-mode-selector">
        <FormRadioTabs
          :id="'batch-rewrite-diff-mode-' + id"
          v-model="diffMode"
          :options="diffModeOptions"
          :label="$t('diffModeLabel', 'Display')"
        />
      </div>
      <div class="bk-batch-rewrite-list" @mouseleave="onMouseLeave">
        <ItemComponent
          v-for="item in items"
          :key="item.id"
          v-model:selected="selected[item.id]"
          v-model:reason="reasons[item.id]"
          :uuid="item.uuid"
          :field-name="item.fieldName"
          :field-label="item.fieldLabel"
          :new-value="item.value"
          :diff-mode="diffMode"
          :operations="item.operations"
        />
      </div>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        @click="applySelected"
      >
        <Icon name="bk_mdi_check" />
        <span>{{ applyLabel }}</span>
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, ref, reactive, onMounted, useId } from '#imports'
import { Icon, FormRadioTabs } from '#blokkli/editor/components'
import type { DiffDisplayMode } from '#blokkli/editor/components/DiffViewer/DiffDisplay/index.vue'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import ItemComponent from './Item.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { BatchRewriteParams, BatchRewriteResult } from './index'
import { itemEntityType } from '#blokkli-build/config'
import { applyOperations } from '../helpers'

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
  (
    e: 'done',
    result: BatchRewriteResult & { _details?: BatchRewriteDetailItem[] },
  ): void
}>()

const {
  $t,
  state,
  blocks,
  context: editorContext,
  types,
  directive,
  eventBus,
  storage,
} = useBlokkli()

const id = useId()

const diffMode = storage.use<DiffDisplayMode>('diffMode', 'inline')

const diffModeOptions = computed(() => [
  { value: 'inline', label: $t('diffModeInline', 'Inline') },
  { value: 'side_by_side', label: $t('diffModeSideBySide', 'Both') },
  { value: 'after', label: $t('diffModeAfter', 'After') },
])

const isApplying = ref(false)

onMounted(() => {
  if (props.params.requireApproval === false) {
    applySelected()
  }
})

type ChangeItem = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  value: string
  operations?: Array<{ search: string; replace: string }>
}

function resolveHost(
  uuid: string,
): { entityType: string; bundle: string } | null {
  if (uuid === editorContext.value.entityUuid) {
    return {
      entityType: editorContext.value.entityType,
      bundle: editorContext.value.entityBundle,
    }
  }
  const block = blocks.getBlock(uuid)
  if (!block) return null
  return { entityType: itemEntityType, bundle: block.bundle }
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

function buildItems(): ChangeItem[] {
  const result: ChangeItem[] = []

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

      // Build display operations (without selector flag) for compact diff.
      const displayOps: Array<{ search: string; replace: string }> = ops.map(
        (op) => ({ search: op.search, replace: op.replace }),
      )

      result.push({
        id: idCounter++,
        uuid,
        fieldName,
        fieldLabel: resolveFieldLabel(uuid, fieldName),
        value: newValue,
        operations: displayOps,
      })
    }
  }

  return result
}

const items: ChangeItem[] = buildItems().filter((item) => {
  const current = getCurrentValue(item.uuid, item.fieldName)
  if (current !== null) {
    beforeValues.set(item.id, current)
  }
  return current === null || current !== item.value
})

const selected = reactive<Record<number, boolean>>(
  Object.fromEntries(items.map((item) => [item.id, true])),
)
const reasons = reactive<Record<number, string>>(
  Object.fromEntries(items.map((item) => [item.id, ''])),
)

const selectedCount = computed(
  () => items.filter((item) => selected[item.id]).length,
)

function onMouseLeave() {
  eventBus.emit('highlight', null)
}

async function applySelected() {
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

function rejectAll() {
  const rejectedByUser: Record<
    string,
    Record<string, { reasonForRejection: string }>
  > = {}
  for (const item of items) {
    const fields = rejectedByUser[item.uuid] ?? {}
    fields[item.fieldName] = { reasonForRejection: '' }
    rejectedByUser[item.uuid] = fields
  }

  // Item components will restore on unmount.
  emit('done', {
    acceptedCount: 0,
    rejectedByUser,
    label: $t('aiAgentBatchRewriteAllRejected', 'All changes rejected'),
    agentMessage:
      'All changes were rejected by the user. Ask the user what they would like to change instead.',
  })
}

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', items.length.toString())
})
</script>
