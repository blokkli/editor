<template>
  <div
    class="bk-batch-rewrite-item"
    :class="{ 'bk-is-deselected': !selected }"
    @mouseenter="onMouseEnter"
  >
    <label class="bk-checkbox">
      <input type="checkbox" :checked="selected" @change="onChange" />
      <span>{{ fieldLabel }}</span>
    </label>
    <div class="bk-batch-rewrite-change">
      <div>
        <DiffDisplay
          :before="override.originalValue"
          :after="newValue"
          :mode="diffMode"
        />
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
  </div>
</template>

<script lang="ts" setup>
import { watch, onBeforeUnmount, useBlokkli, nextTick } from '#imports'
import { DiffDisplay, FlexTextarea } from '#blokkli/editor/components'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'

import type { DiffDisplayMode } from '#blokkli/editor/components/DiffViewer/DiffDisplay/index.vue'

const props = defineProps<{
  uuid: string
  fieldName: string
  fieldLabel: string
  newValue: string
  diffMode: DiffDisplayMode
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

function onMouseEnter() {
  if (override.element) {
    eventBus.emit('highlight', override.element)
    eventBus.emit('scrollIntoView', {
      element: override.element,
      immediate: true,
    })
  }
}

// Apply preview immediately.
override.setValue(props.newValue)

async function onChange() {
  selected.value = !selected.value
  await nextTick()
  onMouseEnter()
}

// Toggle preview when selection changes.
watch(selected, (isSelected) => {
  if (isSelected) {
    override.setValue(props.newValue)
  } else {
    override.restore()
  }
})

// Restore on unmount.
onBeforeUnmount(() => {
  override.restore()
})
</script>
