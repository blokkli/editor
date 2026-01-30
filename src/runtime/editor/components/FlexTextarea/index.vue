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
      @keydown="onKeydown"
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
}>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const modelValue = defineModel<string>({ required: true })

const textarea = useTemplateRef('textarea')

const height = ref(20)
const minHeight = 20

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

// Reset height when content is cleared
watch(modelValue, (newValue) => {
  if (!newValue) {
    height.value = minHeight
  }
})

onBlokkliEvent('animationFrame', () => {
  const scrollHeight = textarea.value?.scrollHeight ?? minHeight
  const newHeight = Math.max(scrollHeight, minHeight)
  height.value = props.maxHeight ? Math.min(newHeight, props.maxHeight) : newHeight
})

defineExpose({
  focus: () => textarea.value?.focus(),
  blur: () => textarea.value?.blur(),
  element: textarea,
})
</script>
