import { defineEditorComponent } from '#blokkli/editor/composables'
import Text from './index.vue'

export default defineEditorComponent({
  id: 'form-text',
  label: 'Text',
  category: 'Form',
  component: Text,
  description:
    'Single-line text input with a built-in clear button. Use `lazy` to update the model only on blur.',
  variants: [
    {
      label: 'Default',
      props: {
        id: 'name',
        label: 'Display name',
        placeholder: 'e.g. Jane Doe',
        modelValue: 'Jane Doe',
      },
    },
    {
      label: 'With description and constraints',
      props: {
        id: 'slug',
        label: 'Slug',
        description: 'Lowercase letters and dashes only.',
        placeholder: 'my-article',
        modelValue: '',
        minlength: 3,
        maxlength: 64,
        required: true,
      },
    },
    {
      label: 'Lazy update',
      description: 'Model is updated on blur / Enter, not on every keystroke.',
      props: {
        id: 'lazy',
        label: 'Search',
        placeholder: 'Type and press Enter',
        modelValue: '',
        lazy: true,
      },
    },
    {
      label: 'Disabled',
      props: {
        id: 'disabled',
        label: 'Read-only',
        modelValue: 'Cannot edit',
        disabled: true,
      },
    },
  ],
})
