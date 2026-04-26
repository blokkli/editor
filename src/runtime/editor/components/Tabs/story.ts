import { h } from '#imports'
import { defineEditorComponent } from '#blokkli/editor/composables'
import Tabs from './index.vue'

export default defineEditorComponent({
  id: 'tabs',
  label: 'Tabs',
  category: 'Navigation',
  component: Tabs,
  description:
    'Horizontal tab strip on a dark bar. Pass a list of `{ id, label }` items, bind `v-model` to the active id.',
  variants: [
    {
      label: 'Three tabs',
      props: {
        tabs: [
          { id: 'overview', label: 'Overview' },
          { id: 'details', label: 'Details' },
          { id: 'history', label: 'History' },
        ],
        modelValue: 'overview',
      },
      slots: {
        default: () =>
          h(
            'div',
            { class: 'bk p-20 bg-white text-mono-900' },
            'Tab panel content goes here.',
          ),
      },
    },
    {
      label: 'Two tabs, no panel',
      description:
        'When no default slot is provided the panel area is omitted.',
      props: {
        tabs: [
          { id: 'edit', label: 'Edit' },
          { id: 'preview', label: 'Preview' },
        ],
        modelValue: 'preview',
      },
    },
  ],
})
