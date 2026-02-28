<template>
  <div
    class="bk-batch-rewrite-item"
    :class="{ 'bk-is-deselected': !selected }"
  >
    <div class="bk-batch-rewrite-item-header">
      <label class="bk-checkbox">
        <input type="checkbox" :checked="selected" @change="onChange" />
        <span>{{ fieldLabel }}</span>
      </label>
      <button class="bk-batch-rewrite-item-locate" @click="onLocate">
        <Icon name="bk_mdi_visibility" />
      </button>
    </div>
    <div class="bk-batch-rewrite-preview">
      {{ plainText }}
    </div>
    <div v-if="!selected" class="bk-batch-rewrite-reason">
      <FlexTextarea
        v-model="reason"
        textarea-class
        :max-height="100"
        :min-height="42"
        :placeholder="
          $t(
            'aiAgentBatchRewriteReasonPlaceholder',
            'Reason for rejection (optional)',
          )
        "
        @click.prevent
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, onBeforeUnmount, useBlokkli, computed } from '#imports'
import { FlexTextarea, Icon } from '#blokkli/editor/components'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import diff from 'html-diff-ts'

const props = defineProps<{
  uuid: string
  fieldName: string
  fieldLabel: string
  newValue: string
}>()

const selected = defineModel<boolean>('selected', { default: false })
const reason = defineModel<string>('reason', { default: '' })

const { blocks, context, eventBus, $t } = useBlokkli()

function resolveHost(): EntityContext {
  if (props.uuid === context.value.entityUuid) {
    return {
      type: context.value.entityType,
      bundle: context.value.entityBundle,
      uuid: props.uuid,
    }
  }
  const block = blocks.getBlock(props.uuid)
  return {
    type: itemEntityType,
    bundle: block?.bundle || '',
    uuid: props.uuid,
  }
}

const host = resolveHost()
const override = useEditableFieldOverride(props.fieldName, host)

/**
 * Extract plain text from the new value (strip HTML tags).
 */
const plainText = (() => {
  const tmp = document.createElement('div')
  tmp.innerHTML = props.newValue
  return tmp.textContent || ''
})()

const diffHtml = computed(() => diff(override.originalValue, props.newValue))

function applyOverride() {
  if (selected.value) {
    override.setDiffHtml(diffHtml.value)
  } else {
    override.restore()
  }
}

function onLocate() {
  if (override.element) {
    eventBus.emit('highlight', override.element)
    eventBus.emit('scrollIntoView', {
      element: override.element,
      immediate: true,
    })
  }
}

// Apply preview immediately.
applyOverride()

function onChange() {
  selected.value = !selected.value
}

// Toggle preview when selection changes.
watch(selected, () => {
  applyOverride()
})

// Restore on unmount.
onBeforeUnmount(() => {
  override.restore()
})
</script>
