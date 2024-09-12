<template>
  <div class="rich-text">
    <Ckeditor
      v-model="markup"
      :editor="ClassicEditor"
      @input="$emit('update:modelValue', $event)"
      @ready="onReady"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from '#imports'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { Ckeditor } from '@ckeditor/ckeditor5-vue'

const props = defineProps<{
  modelValue: string
}>()

const markup = ref('')

const emit = defineEmits(['update:modelValue', 'ready'])

const onReady = () => {
  emit('ready')
  const ck = document.querySelector('[contenteditable]')
  if (ck instanceof HTMLElement) {
    ck.focus()
  }
}

onMounted(() => {
  markup.value = props.modelValue
})
</script>

<style lang="postcss"></style>
