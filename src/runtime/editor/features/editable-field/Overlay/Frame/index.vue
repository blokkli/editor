<template>
  <div
    class="bk-editable-field-frame"
    :class="{
      'bk-is-fullscreen': isFullscreen,
    }"
  >
    <iframe
      ref="iframe"
      :style
      :src="url"
      class="block w-full"
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
import type { EntityContext } from '#blokkli/types'
import { itemEntityType } from '#blokkli-build/config'
import type { EditableFieldType } from '../../types'
import type { StyleValue } from 'vue'

const { adapter, ui, element } = useBlokkli()

const PROPAGATE_WHEEL = false

const rootElement = ui.rootElement()

const props = defineProps<{
  type: EditableFieldType
  fieldName: string
  host: EntityContext
  initialHeight: number
  isFullscreen: boolean
}>()

const modelValue = defineModel<string>({ required: true })

const emit = defineEmits<{
  formatted: [text: string]
}>()

const style = computed<StyleValue>(() => {
  if (props.isFullscreen) {
    return {
      height: '100%',
    }
  }

  return {
    height: Math.max(height.value, 400) + 'px',
  }
})

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
      const el = element.query(
        iframeDoc.documentElement,
        '.ck-editor__editable',
        'Find CKEditor in editable iframe.',
      )
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
  if (props.host.type === itemEntityType) {
    return adapter.buildEditableFrameUrl!({
      uuid: props.host.uuid,
      fieldName: props.fieldName,
    })
  }

  return adapter.buildEditableFrameUrl!({
    fieldName: props.fieldName,
  })
})

const onMessage = (e: MessageEvent) => {
  if (typeof e.data === 'object') {
    if (e.data.name === 'blokkli__editable_field_update') {
      modelValue.value = e.data.data.text
    } else if (e.data.name === 'blokkli__editable_field_update_formatted') {
      emit('formatted', e.data.data.text)
    } else if (e.data.name === 'blokkli__editable_field_update_height') {
      height.value = e.data.data.height
    }
  }
}

/**
 * Push a new value into the iframe's editor.
 */
function setValue(text: string) {
  iframe.value?.contentWindow?.postMessage(
    { name: 'blokkli__editable_field_set_value', data: { text } },
    '*',
  )
}

defineExpose({ setValue })

onMounted(() => {
  height.value = props.initialHeight

  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})
</script>

<style lang="postcss">
.bk .bk-editable-field-frame {
  &:not(.bk-is-fullscreen) {
    iframe {
      max-height: calc(100vh - 500px);
      @variant lg {
        @apply min-w-[700px];
        min-height: 400px;
      }

      @variant xl {
        @apply min-w-[700px];
      }
    }
  }
}
</style>
