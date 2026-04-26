import { defineEditorComponent } from '#blokkli/editor/composables'
import Select from './index.vue'

const languages = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
]

export default defineEditorComponent({
  id: 'form-select',
  label: 'Select',
  category: 'Form',
  component: Select,
  description: 'Native `<select>` styled to match the editor form aesthetic.',
  variants: [
    {
      label: 'Default',
      props: {
        id: 'lang',
        label: 'Language',
        options: languages,
        modelValue: 'en',
      },
    },
    {
      label: 'Required with description',
      props: {
        id: 'lang-required',
        label: 'Interface language',
        description: 'Used for the editor UI. Saved per user.',
        options: languages,
        modelValue: 'de',
        required: true,
      },
    },
    {
      label: 'Disabled',
      props: {
        id: 'lang-disabled',
        label: 'Language',
        options: languages,
        modelValue: 'fr',
        disabled: true,
      },
    },
  ],
})
