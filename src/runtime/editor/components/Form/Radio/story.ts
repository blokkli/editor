import { defineEditorComponent } from '#blokkli/editor/composables'
import Radio from './index.vue'

const sizes = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

export default defineEditorComponent({
  id: 'form-radio',
  label: 'Radio',
  category: 'Form',
  component: Radio,
  description: 'Single-value radio button group.',
  variants: [
    {
      label: 'Default',
      props: {
        id: 'size',
        label: 'Size',
        description: 'Choose one option.',
        options: sizes,
        modelValue: 'md',
      },
    },
    {
      label: 'Inline',
      props: {
        id: 'size-inline',
        label: 'Size',
        options: sizes,
        modelValue: 'sm',
        inline: true,
      },
    },
    {
      label: 'Required & disabled',
      props: {
        id: 'size-disabled',
        label: 'Locked size',
        options: sizes,
        modelValue: 'lg',
        required: true,
        disabled: true,
      },
    },
  ],
})
