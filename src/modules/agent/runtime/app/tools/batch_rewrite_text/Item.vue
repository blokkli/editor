<template>
  <label class="bk-batch-rewrite-item" :class="{ 'bk-is-deselected': !selected }" @mouseenter="onMouseEnter">
    <input type="checkbox" :checked="selected" @change="$emit('toggle')" />
    <div class="bk-batch-rewrite-change">
      <div class="bk-batch-rewrite-field">{{ fieldLabel }}</div>
      <DiffValue :before="override.originalValue" :after="newValue" />
    </div>
  </label>
</template>

<script lang="ts" setup>
import { watch, onBeforeUnmount, useBlokkli } from '#imports'
import { DiffValue } from '#blokkli/editor/components'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'

const props = defineProps<{
  uuid: string
  fieldName: string
  fieldLabel: string
  newValue: string
  selected: boolean
  applied: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
}>()

const { blocks, context, eventBus } = useBlokkli()

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
  }
}

// Apply preview immediately.
override.setValue(props.newValue)

// Toggle preview when selection changes.
watch(
  () => props.selected,
  (isSelected) => {
    if (isSelected) {
      override.setValue(props.newValue)
    } else {
      override.restore()
    }
  },
)

// Restore on unmount if not applied.
onBeforeUnmount(() => {
  if (!props.applied) {
    override.restore()
  }
})
</script>
