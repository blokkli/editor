import { defineEditorComponent } from '#blokkli/editor/composables'
import Textarea from './index.vue'

export default defineEditorComponent({
  id: 'form-textarea',
  label: 'Textarea',
  category: 'Form',
  component: Textarea,
  description: 'Multi-line text input. Defaults to 5 rows.',
  variants: [
    {
      label: 'Default',
      props: {
        id: 'bio',
        label: 'Biography',
        placeholder: 'A short introduction…',
        modelValue: '',
      },
    },
    {
      label: 'Pre-filled with description',
      props: {
        id: 'notes',
        label: 'Internal notes',
        description: 'Visible only to editors.',
        modelValue:
          'These are some notes for the editorial team that span multiple lines so the textarea actually shows its size.',
        rows: 8,
      },
    },
    {
      label: 'Required & constrained',
      props: {
        id: 'summary',
        label: 'Summary',
        modelValue: '',
        required: true,
        minlength: 20,
        maxlength: 200,
      },
    },
    {
      label: 'Disabled',
      props: {
        id: 'disabled',
        label: 'Locked',
        modelValue: 'Cannot edit this content.',
        disabled: true,
      },
    },
  ],
})
