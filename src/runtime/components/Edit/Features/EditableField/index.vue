<template>
  <Teleport :to="ui.isMobile.value ? 'body' : '.bk-main-canvas'">
    <Transition :name="hasTransition ? 'bk-editable' : undefined">
      <Overlay v-if="editable" v-bind="editable" :key="key" />
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import type { EditableFieldFocusEvent } from '#blokkli/types'
import Overlay from './Overlay/index.vue'
import { ref, onMounted, onBeforeUnmount, useBlokkli, watch } from '#imports'

const { eventBus, selection, ui } = useBlokkli()
const editable = ref<EditableFieldFocusEvent | null>(null)
const hasTransition = ref(false)

const key = computed(() => {
  if (!editable.value) {
    return ''
  }
  return editable.value.block.uuid + editable.value.fieldName
})

const onEditableFocus = (e: EditableFieldFocusEvent) => {
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
