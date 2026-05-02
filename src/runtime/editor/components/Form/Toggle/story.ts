import { defineEditorComponent } from '#blokkli/editor/composables'
import Toggle from './index.vue'

export default defineEditorComponent({
  id: 'form-toggle',
  label: 'Toggle',
  category: 'Form',
  component: Toggle,
  description:
    'Switch-style boolean control. Renders the label/description on the right side.',
  variants: [
    {
      label: 'Off',
      props: {
        label: 'Show grid lines',
        description: 'Overlay a grid on the canvas.',
        modelValue: false,
      },
    },
    {
      label: 'On',
      props: {
        label: 'Auto-save',
        description: 'Persist edits as soon as you stop typing.',
        modelValue: true,
      },
    },
    {
      label: 'Label only',
      props: {
        label: 'Verbose logs',
        modelValue: false,
      },
    },
    {
      label: 'Disabled with reason',
      props: {
        label: 'Publish on save',
        description: 'Automatically publish whenever changes are saved.',
        modelValue: false,
        disabled: true,
        disabledReason:
          'You need the "Publish" permission to enable this option.',
      },
    },
    {
      label: 'Dark color scheme',
      backgroundClass: 'bg-mono-900',
      props: {
        label: 'Auto-save',
        description: 'Persist edits as soon as you stop typing.',
        modelValue: true,
        colorScheme: 'dark',
      },
    },
  ],
})
