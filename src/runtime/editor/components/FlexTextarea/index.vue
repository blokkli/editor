<template>
  <div
    class="bk-flex-textarea"
    :class="{ 'bk-is-scrollable': isScrollable }"
    :style="{
      height: height + 'px',
    }"
  >
    <textarea
      ref="textarea"
      v-bind="$attrs"
      v-model="modelValue"
      :class="{
        'bk-form-input': textareaClass,
      }"
      @keydown.capture.stop="onKeydown"
      @keyup.capture.stop
      @pointerdown="onPointerDown"
      @paste="onPaste"
    />
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef, ref, computed, watch, onMounted } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { ClipboardData } from '#blokkli/editor/helpers/clipboardData'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    maxHeight?: number
    minHeight?: number
    submitOnEnter?: boolean
    /** When true, convert pasted HTML to markdown */
    pasteMarkdown?: boolean
    /** Called before the built-in paste handling. Return true to skip it. */
    onBeforePaste?: (data: ClipboardData) => boolean
    textareaClass?: boolean
    autofocus?: boolean
  }>(),
  {
    minHeight: 70,
    maxHeight: undefined,
    onBeforePaste: undefined,
  },
)

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const modelValue = defineModel<string>({ required: true })

const textarea = useTemplateRef('textarea')

const height = ref(props.minHeight)

const isScrollable = computed(() => {
  if (!props.maxHeight) return false
  return height.value >= props.maxHeight
})

// Workaround for Chromium bug where CSS transform on a parent breaks textarea
// text selection when the pointer leaves the element.
// https://issues.chromium.org/issues/41439320
function onPointerDown(e: PointerEvent) {
  if (e.target instanceof HTMLElement) {
    e.target.setPointerCapture(e.pointerId)
  }
}

function onKeydown(e: KeyboardEvent) {
  emit('keydown', e)
  if (props.submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit')
  }
}

function onPaste(e: ClipboardEvent) {
  if (!e.clipboardData) return
  const data = new ClipboardData(e.clipboardData)
  if (props.onBeforePaste?.(data)) {
    e.preventDefault()
    return
  }
  if (!props.pasteMarkdown || !data.hasHtml()) return

  e.preventDefault()

  const markdown = data.toMarkdown()

  const el = textarea.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const before = modelValue.value.slice(0, start)
  const after = modelValue.value.slice(end)

  modelValue.value = before + markdown + after

  const newPos = start + markdown.length
  requestAnimationFrame(() => {
    el.setSelectionRange(newPos, newPos)
  })
}

// Reset height when content is cleared
watch(modelValue, (newValue) => {
  if (!newValue) {
    height.value = props.minHeight
  }
})

onBlokkliEvent('animationFrame', () => {
  const scrollHeight = textarea.value?.scrollHeight ?? props.minHeight
  const newHeight = Math.max(scrollHeight, props.minHeight)
  height.value = props.maxHeight
    ? Math.min(newHeight, props.maxHeight)
    : newHeight
})

onMounted(() => {
  if (props.autofocus && textarea.value) {
    textarea.value.focus()
  }
})

defineExpose({
  focus: () => textarea.value?.focus(),
  blur: () => textarea.value?.blur(),
  element: textarea,
})
</script>
