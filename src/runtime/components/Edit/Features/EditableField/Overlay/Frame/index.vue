<template>
  <div class="bk-editable-field-frame">
    <iframe
      ref="iframe"
      :style="{ height: Math.max(height, 150) + 'px' }"
      :src="url"
      @load="onIframeLoad"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
} from '#imports'
import type {
  DraggableExistingBlock,
  EditableFieldType,
  EntityContext,
} from '#blokkli/types'

const { adapter, ui } = useBlokkli()

const PROPAGATE_WHEEL = false

const rootElement = ui.rootElement()

const props = defineProps<{
  modelValue: string
  type: EditableFieldType
  fieldName: string
  host: DraggableExistingBlock | EntityContext
  initialHeight: number
}>()

const iframe = useTemplateRef('iframe')

function onIframeLoad() {
  if (!iframe.value || !PROPAGATE_WHEEL) {
    return
  }

  const iframeDoc = iframe.value.contentDocument

  if (!iframeDoc) {
    return
  }

  let ckEditor: HTMLElement | null = null

  iframe.value.contentDocument.addEventListener('wheel', (e) => {
    if (!ckEditor) {
      const el = iframeDoc.querySelector('.ck-editor__editable') as
        | HTMLElement
        | undefined
      if (el) {
        ckEditor = el
      }
    }

    if (!ckEditor) {
      return
    }

    // Determine if the element has fully scrolled to the top or bottom
    const scrollTop = ckEditor.scrollTop
    const scrollHeight = ckEditor.scrollHeight
    const clientHeight = ckEditor.clientHeight
    const isScrolledToTop = scrollTop === 0
    // Add tolerance of 1px to account for rounding errors
    const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 1

    // Check scroll direction
    const isScrollingDown = e.deltaY > 0
    const isScrollingUp = e.deltaY < 0

    // Only propagate the event if the element can't scroll further in that direction
    const shouldPropagate =
      (isScrollingUp && isScrolledToTop) ||
      (isScrollingDown && isScrolledToBottom)

    if (!shouldPropagate) {
      return
    }

    // Dispatch a wheel event on rootElement to sync scroll/zoom behavior
    const wheelEvent = new WheelEvent('wheel', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode: e.deltaMode,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      bubbles: true,
      cancelable: true,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    })
    rootElement?.dispatchEvent(wheelEvent)
  })
}

const height = ref(props.initialHeight)

const url = computed(() => {
  if ('itemBundle' in props.host) {
    return adapter.buildEditableFrameUrl!({
      uuid: props.host.uuid,
      fieldName: props.fieldName,
    })
  }

  return adapter.buildEditableFrameUrl!({
    fieldName: props.fieldName,
  })
})

const original = ref('')

const emit = defineEmits(['update:modelValue', 'close'])

const onMessage = (e: MessageEvent) => {
  if (typeof e.data === 'object') {
    if (e.data.name === 'blokkli__editable_field_update') {
      emit('update:modelValue', e.data.data.text)
    } else if (e.data.name === 'blokkli__editable_field_update_height') {
      height.value = e.data.data.height
    }
  }
}

onMounted(() => {
  original.value = props.modelValue
  height.value = props.initialHeight

  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})
</script>
