import { h } from '#imports'
import { defineEditorComponent } from '#blokkli/editor/composables'
import Item from './index.vue'

export default defineEditorComponent({
  id: 'form-item',
  label: 'Item',
  category: 'Form',
  component: Item,
  description:
    'A spacing wrapper used to stack a label, input and description as a single form field.',
  variants: [
    {
      label: 'Text input',
      props: {},
      slots: {
        default: () => [
          h('label', { class: 'bk-form-label', for: 'demo-name' }, 'Name'),
          h('input', {
            id: 'demo-name',
            type: 'text',
            class: 'bk-form-input',
            value: 'Jane',
          }),
          h(
            'div',
            { class: 'bk-form-description' },
            'Shown publicly on your profile.',
          ),
        ],
      },
    },
    {
      label: 'Without description',
      props: {},
      slots: {
        default: () => [
          h('label', { class: 'bk-form-label', for: 'demo-bio' }, 'Bio'),
          h('textarea', {
            id: 'demo-bio',
            class: 'bk-form-input',
            rows: 3,
          }),
        ],
      },
    },
  ],
})
