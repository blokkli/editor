<template>
  <Teleport :to="ui.isMobile.value ? 'body' : '.bk-main-canvas'">
    <Transition :name="hasTransition ? 'bk-editable' : undefined">
      <Overlay v-if="editable" v-bind="editable" :key="key" />
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
  watch,
  defineBlokkliFeature,
} from '#imports'
import Overlay from './Overlay/index.vue'
import type { EditableFieldFocusEvent } from '#blokkli/types'

defineBlokkliFeature({
  id: 'editable-field',
  icon: 'textbox',
  label: 'Editable Field',
  requiredAdapterMethods: ['updateFieldValue'],
  description: 'Implements a form overlay to edit a single field of a block.',
})

const { eventBus, selection, ui, adapter } = useBlokkli()
const editable = ref<EditableFieldFocusEvent | null>(null)
const hasTransition = ref(false)

const key = computed(() => {
  if (!editable.value) {
    return ''
  }
  return editable.value.block.uuid + editable.value.fieldName
})

const onEditableFocus = (e: EditableFieldFocusEvent) => {
  // Adapter doesn't support editable frames, return.
  if (e.args?.type === 'frame' && !adapter.buildEditableFrameUrl) {
    editable.value = null
    return
  }
  hasTransition.value = !editable.value
  editable.value = e
  selection.editableActive.value = true
}

watch(selection.editableActive, (isActive) => {
  if (!isActive) {
    hasTransition.value = true
    editable.value = null
  }
})

onMounted(() => {
  eventBus.on('editable:focus', onEditableFocus)
})

onBeforeUnmount(() => {
  eventBus.off('editable:focus', onEditableFocus)
})
</script>
