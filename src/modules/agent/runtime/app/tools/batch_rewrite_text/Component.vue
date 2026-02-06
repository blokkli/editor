<template>
  <ToolCard
    icon="bk_mdi_edit"
    :title="$t('aiAgentBatchRewriteTitle', 'Rewrite @count fields').replace('@count', String(changes.length))"
    @cancel="rejectAll"
  >
    <div class="bk-batch-rewrite-list" @mouseleave="onMouseLeave">
      <Item
        v-for="change in changes"
        :key="change.id"
        :uuid="change.uuid"
        :field-name="change.fieldName"
        :field-label="change.fieldLabel"
        :new-value="change.value"
        :selected="change.selected"
        :applied="change.applied"
        @toggle="change.selected = !change.selected"
      />
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        :disabled="selectedCount === 0"
        @click="applySelected"
      >
        <Icon name="bk_mdi_check" />
        <span>{{ applyLabel }}</span>
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { reactive, computed, useBlokkli } from '#imports'
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

const { $t, state, blocks, context: editorContext, types, eventBus } =
  useBlokkli()

type ChangeWithState = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  value: string
  selected: boolean
  applied: boolean
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
  })),
)

const selectedCount = computed(() => changes.filter((c) => c.selected).length)

function onMouseLeave() {
  eventBus.emit('highlight', null)
}

async function applySelected() {
  const applied: Array<{ uuid: string; fieldName: string }> = []
  const rejected: Array<{ uuid: string; fieldName: string }> = []

  for (const change of changes) {
    if (!change.selected) {
      rejected.push({ uuid: change.uuid, fieldName: change.fieldName })
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
    applied.push({ uuid: change.uuid, fieldName: change.fieldName })
  }

  const label =
    applied.length === changes.length
      ? $t('aiAgentBatchRewriteAllApplied', 'All @count changes applied').replace(
          '@count',
          String(applied.length),
        )
      : $t('aiAgentBatchRewriteSomeApplied', '@applied of @total changes applied')
          .replace('@applied', String(applied.length))
          .replace('@total', String(changes.length))

  emit('done', {
    applied,
    rejected,
    label,
    historyIndex: state.currentMutationIndex.value,
  })
}

function rejectAll() {
  // Item components will restore on unmount.
  emit('done', {
    applied: [],
    rejected: changes.map((c) => ({
      uuid: c.uuid,
      fieldName: c.fieldName,
    })),
    label: $t('aiAgentBatchRewriteAllRejected', 'All changes rejected by user'),
  })
}

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', changes.length.toString())
})
</script>
