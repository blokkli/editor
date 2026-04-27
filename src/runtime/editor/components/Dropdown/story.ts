import { h } from '#imports'
import { defineEditorComponent } from '#blokkli/editor/composables'
import { Icon } from '#blokkli/editor/components'
import Dropdown from './index.vue'

export default defineEditorComponent({
  id: 'dropdown',
  label: 'Dropdown',
  category: 'Overlays',
  component: Dropdown,
  description:
    'A button that toggles a floating menu. Provides keyboard navigation and a `close()` helper passed to the default slot.',
  variants: [
    {
      label: 'Default (bottom-left)',
      props: {
        position: 'bottom-left',
      },
      slots: {
        button: () =>
          h(
            'span',
            { class: 'bk-button bk-is-icon-only' },
            h(Icon, { name: 'bk_mdi_menu' }),
          ),
        default: ({ close }: { close: () => void }) => [
          h(
            'button',
            {
              class: 'bk-dropdown-menu-item',
              onClick: close,
            },
            [h(Icon, { name: 'bk_mdi_edit' }), 'Edit'],
          ),
          h(
            'button',
            {
              class: 'bk-dropdown-menu-item',
              onClick: close,
            },
            [h(Icon, { name: 'bk_mdi_content_copy' }), 'Duplicate'],
          ),
          h('hr'),
          h(
            'button',
            {
              class: 'bk-dropdown-menu-item',
              onClick: close,
            },
            [h(Icon, { name: 'bk_mdi_delete' }), 'Delete'],
          ),
        ],
      },
    },
    {
      label: 'Top-left',
      description:
        'Use this position when the trigger sits near the top of the viewport.',
      props: {
        position: 'top-left',
      },
      slots: {
        button: () => h('span', { class: 'bk-button' }, 'Open menu'),
        default: () => [
          h('button', { class: 'bk-dropdown-menu-item' }, 'First action'),
          h('button', { class: 'bk-dropdown-menu-item' }, 'Second action'),
        ],
      },
    },
    {
      label: 'Disabled',
      props: {
        disabled: true,
      },
      slots: {
        button: () => h('span', { class: 'bk-button' }, 'Cannot open'),
        default: () =>
          h('button', { class: 'bk-dropdown-menu-item' }, 'Hidden item'),
      },
    },
  ],
})
