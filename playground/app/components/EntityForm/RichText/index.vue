<template>
  <div class="rich-text" :class="{
    'is-field-value': isFieldValue
  }">
    <Ckeditor
      v-model="markup"
      :editor="ClassicEditor"
      :config="{
        licenseKey: 'GPL',
      }"
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
  isFieldValue?: boolean
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

<style lang="postcss">
.rich-text.is-field-value {
  .ck.ck-editor__main > .ck-editor__editable {
    @apply !border-0 !border-t !border-t-mono-300;
    height: calc(100vh - 50px);
    max-height: none !important;

    &.ck-focused {
      box-shadow: none !important;
    }
  }
}
</style>
