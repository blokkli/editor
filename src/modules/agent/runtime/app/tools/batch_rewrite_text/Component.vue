<template>
  <ToolCard
    icon="bk_mdi_edit"
    :title="`${$t('batchRewriteTitle', 'Rewrite')} ${changes.length} ${$t('batchRewriteFields', 'fields')}`"
    @cancel="rejectAll"
  >
    <div class="bk-batch-rewrite-list">
      <label
        v-for="change in changes"
        :key="change.id"
        class="bk-batch-rewrite-item"
        :class="{ 'bk-is-deselected': !change.selected }"
      >
        <input type="checkbox" v-model="change.selected" />
        <div class="bk-batch-rewrite-change">
          <div class="bk-batch-rewrite-field">{{ change.fieldName }}</div>
          <div class="bk-batch-rewrite-preview">
            <span class="bk-batch-rewrite-original">{{
              truncate(change.originalValue, 50)
            }}</span>
            <Icon name="bk_mdi_arrow_forward" />
            <span class="bk-batch-rewrite-new">{{
              truncate(change.value, 50)
            }}</span>
          </div>
        </div>
      </label>
    </div>

    <template #actions>
      <button
        class="bk-button bk-is-small bk-is-lime bk-is-fullwidth"
        :disabled="selectedCount === 0"
        @click="applySelected"
      >
        <Icon name="bk_mdi_check" />
        {{ $t('batchRewriteApply', 'Apply') }} {{ selectedCount }} /
        {{ changes.length }}
      </button>
    </template>
  </ToolCard>
</template>

<script lang="ts" setup>
import { ref, computed, onUnmounted, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import ToolCard from '../../features/agent/Panel/ToolCard.vue'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type {
  BatchRewriteParams,
  BatchRewriteResult,
  BatchRewriteChange,
} from './index'

const props = defineProps<{
  context: McpToolContext
  params: BatchRewriteParams
}>()

const emit = defineEmits<{
  (e: 'done', result: BatchRewriteResult): void
}>()

const { $t, state } = useBlokkli()

type ChangeWithState = BatchRewriteChange & {
  id: number
  selected: boolean
  element: HTMLElement | null
  originalValue: string
  fieldType: 'plain' | 'markup'
  applied?: boolean
}

function resolveEntityAndBundle(uuid: string): {
  entityType: string
  bundle: string
} | null {
  const { app, itemEntityType } = props.context
  if (!app) return null
  if (uuid === app.context.value.entityUuid) {
    return {
      entityType: app.context.value.entityType,
      bundle: app.context.value.entityBundle,
    }
  }
  const block = app.blocks.getBlock(uuid)
  if (!block) return null
  return { entityType: itemEntityType, bundle: block.bundle }
}

function getFieldType(
  uuid: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const { app } = props.context
  if (!app) return null
  const resolved = resolveEntityAndBundle(uuid)
  if (!resolved) return null

  const config = app.types.editableFieldConfig.forName(
    resolved.entityType,
    resolved.bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

function findElement(uuid: string, fieldName: string): HTMLElement | null {
  const { app } = props.context
  if (!app) return null
  const resolved = resolveEntityAndBundle(uuid)
  if (!resolved) return null

  return (
    app.directive.findEditableElement(fieldName, {
      type: resolved.entityType,
      uuid,
      bundle: resolved.bundle,
    }) || null
  )
}

// Prepare changes with selection state and apply previews immediately
const changes = ref<ChangeWithState[]>(
  props.params.changes.map((change, index) => {
    const element = findElement(change.uuid, change.fieldName)
    const fieldType = getFieldType(change.uuid, change.fieldName)

    // Get original value
    let originalValue = ''
    if (element) {
      originalValue =
        fieldType === 'markup'
          ? element.innerHTML || ''
          : element.textContent || ''
    }

    // Apply preview immediately
    if (element) {
      if (fieldType === 'markup') {
        element.innerHTML = change.value
      } else {
        element.textContent = change.value
      }
    }

    return {
      ...change,
      id: index,
      selected: true,
      element,
      originalValue,
      fieldType: fieldType || 'plain',
    }
  }),
)

const selectedCount = computed(
  () => changes.value.filter((c) => c.selected).length,
)

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

async function applySelected() {
  const applied: Array<{ uuid: string; fieldName: string }> = []
  const rejected: Array<{ uuid: string; fieldName: string }> = []

  // Revert previews for unselected changes immediately
  for (const change of changes.value) {
    if (!change.selected) {
      if (change.element) {
        if (change.fieldType === 'markup') {
          change.element.innerHTML = change.originalValue
        } else {
          change.element.textContent = change.originalValue
        }
      }
      rejected.push({ uuid: change.uuid, fieldName: change.fieldName })
    }
  }

  // Apply all selected changes via the adapter
  const selectedChanges = changes.value.filter((c) => c.selected)
  const entityUuid = props.context.app?.context.value.entityUuid
  for (const change of selectedChanges) {
    const isEntity = change.uuid === entityUuid
    if (isEntity && props.context.adapter.updateEntityFieldValue) {
      await state.mutateWithLoadingState(() =>
        props.context.adapter.updateEntityFieldValue!({
          fieldName: change.fieldName,
          fieldValue: change.value,
        }),
      )
    } else {
      await state.mutateWithLoadingState(() =>
        props.context.adapter.updateFieldValue!({
          uuid: change.uuid,
          fieldName: change.fieldName,
          fieldValue: change.value,
        }),
      )
    }
    change.applied = true
    applied.push({ uuid: change.uuid, fieldName: change.fieldName })
  }

  const label =
    applied.length === changes.value.length
      ? $t('batchRewriteAllApplied', 'All @count changes applied').replace(
          '@count',
          String(applied.length),
        )
      : $t('batchRewriteSomeApplied', '@applied of @total changes applied')
          .replace('@applied', String(applied.length))
          .replace('@total', String(changes.value.length))

  emit('done', {
    applied,
    rejected,
    label,
    historyIndex: state.currentMutationIndex.value,
  })
}

function rejectAll() {
  // Revert all previews
  for (const change of changes.value) {
    if (change.element) {
      if (change.fieldType === 'markup') {
        change.element.innerHTML = change.originalValue
      } else {
        change.element.textContent = change.originalValue
      }
    }
  }

  emit('done', {
    applied: [],
    rejected: changes.value.map((c) => ({
      uuid: c.uuid,
      fieldName: c.fieldName,
    })),
    label: $t('batchRewriteAllRejected', 'All changes rejected by user'),
  })
}

// Revert previews on unmount (e.g., if user closes sidebar or cancels)
onUnmounted(() => {
  for (const change of changes.value) {
    if (change.element && !change.applied) {
      if (change.fieldType === 'markup') {
        change.element.innerHTML = change.originalValue
      } else {
        change.element.textContent = change.originalValue
      }
    }
  }
})
</script>
