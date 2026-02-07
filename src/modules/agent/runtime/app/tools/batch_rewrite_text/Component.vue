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
    <div
      v-if="!isApplying"
      class="bk-batch-rewrite-list"
      @mouseleave="onMouseLeave"
    >
      <ItemComponent
        v-for="item in items"
        :key="item.id"
        v-model:selected="selected[item.id]"
        v-model:reason="reasons[item.id]"
        :uuid="item.uuid"
        :field-name="item.fieldName"
        :field-label="item.fieldLabel"
        :new-value="item.value"
      />
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
import { computed, useBlokkli, ref, reactive, onMounted } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard/index.vue'
import ItemComponent from './Item.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { BatchRewriteParams, BatchRewriteResult } from './index'
import { itemEntityType } from '#blokkli-build/config'

const props = defineProps<{
  context: McpToolContext
  params: BatchRewriteParams
}>()

const emit = defineEmits<{
  (e: 'done', result: BatchRewriteResult): void
}>()

const {
  $t,
  state,
  blocks,
  context: editorContext,
  types,
  eventBus,
} = useBlokkli()

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
}

function resolveFieldLabel(uuid: string, fieldName: string): string {
  let entityType: string
  let bundle: string

  if (uuid === editorContext.value.entityUuid) {
    entityType = editorContext.value.entityType
    bundle = editorContext.value.entityBundle
  } else {
    const block = blocks.getBlock(uuid)
    if (!block) {
      return fieldName
    }
    entityType = itemEntityType
    bundle = block.bundle
  }

  const config = types.editableFieldConfig.forName(
    entityType,
    bundle,
    fieldName,
  )
  return config?.label || fieldName
}

let idCounter = 0
const items: ChangeItem[] = Object.entries(props.params.changes).flatMap(
  ([uuid, fields]) =>
    Object.entries(fields).map(([fieldName, value]) => ({
      id: idCounter++,
      uuid,
      fieldName,
      fieldLabel: resolveFieldLabel(uuid, fieldName),
      value,
    })),
)

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
  const rejectedByUser: Record<string, Record<string, { reasonForRejection: string }>> = {}

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
  if (rejectedWithoutReason.length === 1 || rejectedWithoutReason.length === 2) {
    const fieldList = rejectedWithoutReason
      .map((r) => `"${r.fieldName}" of block ${r.uuid}`)
      .join(' and ')
    agentMessage = `The user rejected ${fieldList} without a reason. Use the ask_question tool to present the user with 2 or more alternative texts for each rejected field.`
  } else if (rejectedWithoutReason.length > 2) {
    agentMessage =
      'Some changes were rejected without a reason. Ask the user what they would like to change instead.'
  }

  emit('done', {
    acceptedCount,
    rejectedByUser,
    label,
    agentMessage,
    historyIndex: state.currentMutationIndex.value,
  })
}

function rejectAll() {
  const rejectedByUser: Record<string, Record<string, { reasonForRejection: string }>> = {}
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
