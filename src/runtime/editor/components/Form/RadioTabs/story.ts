import { defineEditorComponent } from '#blokkli/editor/composables'
import RadioTabs from './index.vue'

const alignment = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

export default defineEditorComponent({
  id: 'form-radio-tabs',
  label: 'Radio tabs',
  category: 'Form',
  component: RadioTabs,
  description:
    'Segmented control for picking one option. Visually compact alternative to `Radio`.',
  variants: [
    {
      label: 'Default',
      props: {
        id: 'alignment',
        label: 'Alignment',
        options: alignment,
        modelValue: 'left',
      },
    },
    {
      label: 'Lime scheme',
      description: 'Use the `scheme` prop to colorize the active tab.',
      props: {
        id: 'alignment-lime',
        label: 'Alignment',
        options: alignment,
        modelValue: 'center',
        scheme: 'lime',
      },
    },
    {
      label: 'Disabled',
      props: {
        id: 'alignment-disabled',
        label: 'Alignment',
        options: alignment,
        modelValue: 'right',
        disabled: true,
      },
    },
  ],
})
