import { defineEditorComponent } from '#blokkli/editor/composables'
import Action from './index.vue'

export default defineEditorComponent({
  id: 'panel-action',
  label: 'Panel action',
  category: 'Panels',
  component: Action,
  description:
    "Icon + label button. Typically rendered inside a `PanelSection`'s `actions` slot, where siblings are divided by a vertical rule.",
  variants: [
    {
      label: 'Default',
      props: {
        title: 'Edit',
        icon: 'bk_mdi_edit',
      },
    },
    {
      label: 'Active',
      description: 'Use `:active` to highlight the currently selected action.',
      props: {
        title: 'Selected',
        icon: 'bk_mdi_check',
        active: true,
      },
    },
    {
      label: 'Disabled',
      props: {
        title: 'Locked',
        icon: 'bk_mdi_lock',
        disabled: true,
      },
    },
  ],
})
