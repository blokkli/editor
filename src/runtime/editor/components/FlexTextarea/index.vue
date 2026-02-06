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
      @keydown.capture.stop="onKeydown"
      @keyup.capture.stop
      @paste="onPaste"
    />
  </div>
</template>

<script lang="ts" setup>
import { useTemplateRef, ref, computed, watch } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  maxHeight?: number
  submitOnEnter?: boolean
  /** When true, paste HTML from clipboard if available instead of plain text */
  pasteHtml?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const modelValue = defineModel<string>({ required: true })

const textarea = useTemplateRef('textarea')

const height = ref(70)
const minHeight = 70

const isScrollable = computed(() => {
  if (!props.maxHeight) return false
  return height.value >= props.maxHeight
})

function onKeydown(e: KeyboardEvent) {
  emit('keydown', e)
  if (props.submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit')
  }
}

function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Remove style tags
  for (const style of doc.querySelectorAll('style')) {
    style.remove()
  }

  // Remove style attributes from all elements
  for (const el of doc.querySelectorAll('[style]')) {
    el.removeAttribute('style')
  }

  return doc.body.innerHTML
}

function onPaste(e: ClipboardEvent) {
  if (!props.pasteHtml) return

  const html = e.clipboardData?.getData('text/html')
  if (!html) return

  // Prevent default paste and insert HTML instead
  e.preventDefault()

  const cleanedHtml = cleanHtml(html)

  const el = textarea.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const before = modelValue.value.slice(0, start)
  const after = modelValue.value.slice(end)

  modelValue.value = before + cleanedHtml + after

  // Move cursor to end of pasted content
  const newPos = start + cleanedHtml.length
  requestAnimationFrame(() => {
    el.setSelectionRange(newPos, newPos)
  })
}

// Reset height when content is cleared
watch(modelValue, (newValue) => {
  if (!newValue) {
    height.value = minHeight
  }
})

onBlokkliEvent('animationFrame', () => {
  const scrollHeight = textarea.value?.scrollHeight ?? minHeight
  const newHeight = Math.max(scrollHeight, minHeight)
  height.value = props.maxHeight
    ? Math.min(newHeight, props.maxHeight)
    : newHeight
})

defineExpose({
  focus: () => textarea.value?.focus(),
  blur: () => textarea.value?.blur(),
  element: textarea,
})
</script>
