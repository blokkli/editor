import { defineEditorComponent } from '#blokkli/editor/composables'
import Checkboxes from './index.vue'

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'durian', label: 'Durian' },
]

export default defineEditorComponent({
  id: 'form-checkboxes',
  label: 'Checkboxes',
  category: 'Form',
  component: Checkboxes,
  description:
    'Multi-value checkbox group. `v-model` binds an array of selected option values.',
  variants: [
    {
      label: 'Default',
      props: {
        id: 'fruits',
        label: 'Favorite fruits',
        description: 'Pick all that apply.',
        options: fruits,
        modelValue: ['apple', 'cherry'],
      },
    },
    {
      label: 'Inline',
      description: 'Options laid out horizontally.',
      props: {
        id: 'fruits-inline',
        label: 'Favorite fruits',
        options: fruits,
        modelValue: [],
        inline: true,
      },
    },
    {
      label: 'Required & disabled',
      props: {
        id: 'fruits-disabled',
        label: 'Locked selection',
        options: fruits,
        modelValue: ['banana'],
        required: true,
        disabled: true,
      },
    },
  ],
})
