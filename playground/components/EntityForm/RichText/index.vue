<template>
  <div class="rich-text">
    <Component
      :is="CKEditor.component"
      v-model="markup"
      :editor="ClassicEditor"
      @input="$emit('update:modelValue', $event)"
      @ready="$emit('ready')"
    />
  </div>
</template>

<script lang="ts" setup>
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import CKEditor from '@ckeditor/ckeditor5-vue'

const props = defineProps<{
  modelValue: string
}>()

const markup = ref('')

const emit = defineEmits(['update:modelValue', 'ready'])

onMounted(() => {
  markup.value = props.modelValue
})
</script>

<style lang="postcss"></style>
