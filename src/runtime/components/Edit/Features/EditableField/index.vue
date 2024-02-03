<template>
  <Teleport to="body">
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
import type {
  BlokkliEditableDirectiveArgs,
  DraggableExistingBlock,
  EditableFieldFocusEvent,
} from '#blokkli/types'

defineBlokkliFeature({
  id: 'editable-field',
  icon: 'textbox',
  label: 'Editable Field',
  requiredAdapterMethods: ['updateFieldValue'],
  description: 'Implements a form overlay to edit a single field of a block.',
})

type Editable = {
  fieldName: string
  block: DraggableExistingBlock
  element: HTMLElement
  args?: BlokkliEditableDirectiveArgs
  isComponent?: boolean
  value?: string
}

const { eventBus, selection, adapter, dom } = useBlokkli()
const editable = ref<Editable | null>(null)
const hasTransition = ref(false)

const key = computed(() => {
  if (!editable.value) {
    return ''
  }
  return editable.value.block.uuid + editable.value.fieldName
})

const buildEditable = (
  fieldName: string,
  uuid: string,
): Editable | undefined => {
  const block = dom.findBlock(uuid)
  if (!block) {
    return
  }
  const fieldEl = block
    .element()
    .querySelector(`[data-blokkli-editable-field="${fieldName}"]`)
  if (!(fieldEl instanceof HTMLElement)) {
    return
  }
  const argsValue = fieldEl.dataset.blokkliEditableFieldConfig
  const args: BlokkliEditableDirectiveArgs = argsValue
    ? JSON.parse(argsValue)
    : undefined

  // Adapter doesn't support editable frames, return.
  if (args?.type === 'frame' && !adapter.buildEditableFrameUrl) {
    return
  }

  return {
    fieldName,
    block,
    element: fieldEl,
    args,
    isComponent: fieldEl.dataset.blokkliEditableComponent === 'true',
    value: fieldEl.dataset.blokkliEditableValue || '',
  }
}

const onEditableFocus = (e: EditableFieldFocusEvent) => {
  hasTransition.value = !editable.value
  editable.value = buildEditable(e.fieldName, e.uuid) || null
  if (editable.value) {
    selection.editableActive.value = true
  }
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
