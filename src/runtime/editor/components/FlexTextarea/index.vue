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

const props = withDefaults(
  defineProps<{
    maxHeight?: number
    minHeight?: number
    submitOnEnter?: boolean
    /** When true, convert pasted HTML to markdown */
    pasteMarkdown?: boolean
    textareaClass?: boolean
  }>(),
  {
    minHeight: 70,
    maxHeight: undefined,
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

function onKeydown(e: KeyboardEvent) {
  emit('keydown', e)
  if (props.submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('submit')
  }
}

function convertNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(convertNode).join('')

  switch (tag) {
    case 'br':
      return '\n'
    case 'p':
    case 'div':
      return children + '\n\n'
    case 'strong':
    case 'b':
      return `**${children}**`
    case 'em':
    case 'i':
      return `*${children}*`
    case 'del':
    case 's':
      return `~~${children}~~`
    case 'code':
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return children
      }
      return `\`${children}\``
    case 'pre': {
      const codeEl = el.querySelector('code')
      const content = codeEl ? convertNode(codeEl) : children
      return `\n\`\`\`\n${content}\n\`\`\`\n`
    }
    case 'h1':
      return `# ${children}\n\n`
    case 'h2':
      return `## ${children}\n\n`
    case 'h3':
      return `### ${children}\n\n`
    case 'h4':
      return `#### ${children}\n\n`
    case 'h5':
      return `##### ${children}\n\n`
    case 'h6':
      return `###### ${children}\n\n`
    case 'a': {
      const href = el.getAttribute('href')
      return href ? `[${children}](${href})` : children
    }
    case 'ul':
    case 'ol':
      return '\n' + children + '\n'
    case 'li': {
      const parent = el.parentElement
      if (parent?.tagName.toLowerCase() === 'ol') {
        const index = Array.from(parent.children).indexOf(el) + 1
        return `${index}. ${children.trim()}\n`
      }
      return `- ${children.trim()}\n`
    }
    case 'blockquote':
      return (
        children
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n'
      )
    case 'hr':
      return '\n---\n'
    case 'style':
    case 'script':
      return ''
    default:
      return children
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return convertNode(doc.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function onPaste(e: ClipboardEvent) {
  if (!props.pasteMarkdown) return

  const html = e.clipboardData?.getData('text/html')
  if (!html) return

  e.preventDefault()

  const markdown = htmlToMarkdown(html)

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

defineExpose({
  focus: () => textarea.value?.focus(),
  blur: () => textarea.value?.blur(),
  element: textarea,
})
</script>
