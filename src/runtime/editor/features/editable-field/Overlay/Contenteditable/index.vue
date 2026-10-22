<template>
  <div class="bk-editable-field-contenteditable">
    <!-- eslint-disable vue/no-v-html -- X4 in plans/xss: the raw stored value -->
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
  original.value = props.modelValue
})
</script>
