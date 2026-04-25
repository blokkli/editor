<template>
  <div
    class="rich-text"
    :class="{
      'is-field-value': isFieldValue,
    }"
  >
    <ClientOnly>
      <ckeditor
        v-model="markup"
        :editor="ClassicEditor"
        :config="{
          licenseKey: 'GPL',
          plugins: [
            Autoformat,
            AutoImage,
            Autosave,
            BlockQuote,
            Bold,
            CloudServices,
            Code,
            Essentials,
            Heading,
            ImageBlock,
            ImageCaption,
            ImageInline,
            ImageInsertViaUrl,
            ImageStyle,
            ImageTextAlternative,
            ImageToolbar,
            ImageUpload,
            Indent,
            IndentBlock,
            Italic,
            Link,
            LinkImage,
            List,
            Paragraph,
            Subscript,
            Superscript,
            Table,
            TableCaption,
            TableToolbar,
            TextTransformation,
            TodoList,
            Underline,
          ],
          toolbar: [
            'undo',
            'redo',
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            'subscript',
            'superscript',
            'code',
            '|',
            'link',
            'insertTable',
            'blockQuote',
            '|',
            'bulletedList',
            'numberedList',
            'todoList',
            'outdent',
            'indent',
          ],
        }"
        @input="$emit('update:modelValue', $event)"
        @ready="onReady"
      />
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from '#imports'
import { Ckeditor } from '@ckeditor/ckeditor5-vue'
import {
  ClassicEditor,
  Autosave,
  Essentials,
  Paragraph,
  Autoformat,
  TextTransformation,
  LinkImage,
  Link,
  ImageBlock,
  ImageToolbar,
  BlockQuote,
  Bold,
  CloudServices,
  ImageUpload,
  ImageInsertViaUrl,
  AutoImage,
  Table,
  TableToolbar,
  Heading,
  ImageTextAlternative,
  ImageCaption,
  ImageStyle,
  Indent,
  IndentBlock,
  ImageInline,
  Italic,
  List,
  TableCaption,
  TodoList,
  Underline,
  Code,
  Subscript,
  Superscript,
} from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'

const props = defineProps<{
  modelValue: string
  isFieldValue?: boolean
}>()

const markup = ref('')

const emit = defineEmits(['update:modelValue', 'ready'])

let editorInstance: { setData: (data: string) => void } | null = null

const onReady = (editor: typeof editorInstance) => {
  editorInstance = editor
  emit('ready')
  const ck = document.querySelector('[contenteditable]')
  if (ck instanceof HTMLElement) {
    ck.focus()
  }
}

function setData(data: string) {
  editorInstance?.setData(data)
}

defineExpose({ setData })

onMounted(() => {
  markup.value = props.modelValue
})
</script>

<style>
@reference "~/assets/css/tailwind.css";

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
