<template>
  <ToolCard
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
      <Item
        v-for="item in items"
        :key="item.id"
        ref="itemRefs"
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
import { computed, useBlokkli, ref, useTemplateRef } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard.vue'
import Item from './Item.vue'
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

const items: ChangeItem[] = props.params.changes.map((change, index) => ({
  id: index,
  uuid: change.uuid,
  fieldName: change.fieldName,
  fieldLabel: resolveFieldLabel(change.uuid, change.fieldName),
  value: change.value,
}))

const itemRefs = useTemplateRef<InstanceType<typeof Item>[]>('itemRefs')

const selectedCount = computed(
  () => itemRefs.value?.filter((item) => item.selected).length ?? 0,
)

function onMouseLeave() {
  eventBus.emit('highlight', null)
}

async function applySelected() {
  isApplying.value = true

  const refs = itemRefs.value || []

  const rejectedByUser: Array<{
    uuid: string
    fieldName: string
    reason?: string
  }> = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const ref = refs[i]
    if (ref && !ref.selected) {
      rejectedByUser.push({
        uuid: item.uuid,
        fieldName: item.fieldName,
        reason: ref.reason || undefined,
      })
    }
  }

  // Apply all selected changes via the adapter in a single batch.
  const entityUuid = editorContext.value.entityUuid

  const batchItems: Array<{
    uuid: string
    fieldName: string
    fieldValue: string
  }> = []
  const entityItems: Array<{ fieldName: string; fieldValue: string }> = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const ref = refs[i]
    if (!ref?.selected) continue

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

  await state.mutateWithLoadingState(() =>
    props.context.adapter.updateFieldValueBatched!({
      items: batchItems,
      entityItems,
    }),
  )

  for (const ref of refs) {
    if (ref.selected) {
      ref.markApplied()
    }
  }

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

  // If there are rejections without reasons, tell the agent to ask the user.
  const hasRejectionsWithoutReason = rejectedByUser.some((r) => !r.reason)
  const agentMessage =
    rejectedByUser.length > 0 && hasRejectionsWithoutReason
      ? 'Some changes were rejected without a reason. Ask the user what they would like to change instead.'
      : undefined

  emit('done', {
    acceptedCount,
    rejectedByUser,
    label,
    agentMessage,
    historyIndex: state.currentMutationIndex.value,
  })
}

function rejectAll() {
  // Item components will restore on unmount.
  emit('done', {
    acceptedCount: 0,
    rejectedByUser: items.map((c) => ({
      uuid: c.uuid,
      fieldName: c.fieldName,
    })),
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
