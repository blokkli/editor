<template>
  <div class="bk-editable-field-contenteditable">
    <!-- eslint-disable vue/no-v-html -- the stored value, sanitised -->
    <div
      ref="input"
      contenteditable
      @keydown.stop.capture="onKeyDown"
      @input="onInput"
      v-html="original"
    />
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from '#imports'
import { sanitizeHtml } from '#blokkli/editor/helpers/html'

const props = defineProps<{
  modelValue: string
  // @TODO: Probably not needed anymore.
  type: any
}>()

const original = ref('')

const emit = defineEmits(['update:modelValue', 'close'])

const onInput = (e: Event) => {
  if (e.target instanceof HTMLElement) {
    emit('update:modelValue', e.target.innerHTML)
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  // The raw stored value (plans/xss, X4). An edit saves what's shown.
  original.value = sanitizeHtml(props.modelValue, 'richText')
})
</script>
