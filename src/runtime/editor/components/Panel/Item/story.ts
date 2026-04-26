import { h } from '#imports'
import { defineEditorComponent } from '#blokkli/editor/composables'
import ButtonAction from '#blokkli/editor/components/ButtonAction/index.vue'
import Item from './index.vue'

export default defineEditorComponent({
  id: 'panel-item',
  label: 'Panel item',
  category: 'Panels',
  component: Item,
  description:
    'Single selectable row with a title, optional description, icon and color accent. Use to build lists of choices inside a panel.',
  variants: [
    {
      label: 'Default',
      props: {
        title: 'General',
      },
    },
    {
      label: 'With description',
      props: {
        title: 'General',
        description: 'Configure the basic settings for this block.',
      },
    },
    {
      label: 'With icon',
      props: {
        title: 'Edit',
        description: 'Open the inline editor.',
        icon: 'bk_mdi_edit',
      },
    },
    {
      label: 'Theme color',
      description:
        'Use `theme` to pick one of the predefined editor accent colors.',
      props: {
        title: 'Library',
        description: 'Reusable block from the library.',
        icon: 'bk_mdi_content_copy',
        theme: 'lime',
      },
    },
    {
      label: 'With actions',
      description: 'Provide ButtonAction in the actions slot.',
      props: {
        title: 'Library',
        description: 'Reusable block from the library.',
        icon: 'bk_mdi_content_copy',
        theme: 'lime',
      },
      slots: {
        actions: () => {
          return [
            h(ButtonAction, { label: 'Edit', icon: 'bk_mdi_edit' }),
            h(ButtonAction, { label: 'Toggle', icon: 'bk_mdi_visibility' }),
            h(ButtonAction, {
              label: 'Delete',
              icon: 'bk_mdi_delete',
              theme: 'danger',
            }),
          ]
        },
      },
    },
    {
      label: 'Custom color',
      description:
        'Use `color` for a one-off CSS color when no theme color matches.',
      props: {
        title: 'Brand block',
        description: 'Marked with a custom brand color.',
        icon: 'bk_mdi_check',
        theme: { background: '#ff6600', color: 'white' },
      },
    },
    {
      label: 'Disabled',
      props: {
        title: 'Locked',
        description: 'Cannot be selected.',
        icon: 'bk_mdi_lock',
        disabled: true,
      },
    },
  ],
})
