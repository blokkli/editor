<template>
  <ToolCard
    icon="bk_mdi_edit"
    :title="
      $t('aiAgentBatchRewriteTitle', 'Rewrite @count fields').replace(
        '@count',
        String(changes.length),
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
        v-for="change in changes"
        :key="change.id"
        :uuid="change.uuid"
        :field-name="change.fieldName"
        :field-label="change.fieldLabel"
        :new-value="change.value"
        :selected="change.selected"
        :applied="change.applied"
        :reason="change.reason"
        @toggle="change.selected = !change.selected"
        @reason="change.reason = $event"
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
import { reactive, computed, useBlokkli, ref } from '#imports'
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

type ChangeWithState = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  value: string
  selected: boolean
  applied: boolean
  reason: string
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

const changes = reactive<ChangeWithState[]>(
  props.params.changes.map((change, index) => ({
    id: index,
    uuid: change.uuid,
    fieldName: change.fieldName,
    fieldLabel: resolveFieldLabel(change.uuid, change.fieldName),
    value: change.value,
    selected: true,
    applied: false,
    reason: '',
  })),
)

const selectedCount = computed(() => changes.filter((c) => c.selected).length)

function onMouseLeave() {
  eventBus.emit('highlight', null)
}

async function applySelected() {
  isApplying.value = true

  const rejectedByUser: Array<{
    uuid: string
    fieldName: string
    reason?: string
  }> = []

  for (const change of changes) {
    if (!change.selected) {
      rejectedByUser.push({
        uuid: change.uuid,
        fieldName: change.fieldName,
        reason: change.reason || undefined,
      })
    }
  }

  // Apply all selected changes via the adapter in a single batch.
  const selectedChanges = changes.filter((c) => c.selected)
  const entityUuid = editorContext.value.entityUuid

  const items: Array<{ uuid: string; fieldName: string; fieldValue: string }> =
    []
  const entityItems: Array<{ fieldName: string; fieldValue: string }> = []

  for (const change of selectedChanges) {
    if (change.uuid === entityUuid) {
      entityItems.push({
        fieldName: change.fieldName,
        fieldValue: change.value,
      })
    } else {
      items.push({
        uuid: change.uuid,
        fieldName: change.fieldName,
        fieldValue: change.value,
      })
    }
  }

  await state.mutateWithLoadingState(() =>
    props.context.adapter.updateFieldValueBatched!({
      items,
      entityItems,
    }),
  )

  for (const change of selectedChanges) {
    change.applied = true
  }

  const acceptedCount = selectedChanges.length

  const label =
    acceptedCount === changes.length
      ? $t(
          'aiAgentBatchRewriteAllApplied',
          'All @count changes applied',
        ).replace('@count', String(acceptedCount))
      : $t(
          'aiAgentBatchRewriteSomeApplied',
          '@applied of @total changes applied',
        )
          .replace('@applied', String(acceptedCount))
          .replace('@total', String(changes.length))

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
    rejectedByUser: changes.map((c) => ({
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
    .replace('@total', changes.length.toString())
})
</script>
