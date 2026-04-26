import { h } from '#imports'
import { defineEditorComponent } from '#blokkli/editor/composables'
import { Icon } from '#blokkli/editor/components'
import Group from './index.vue'

function formItem(label: string, value = '') {
  return h('div', { class: 'bk-form-item' }, [
    h('label', { class: 'bk-form-label' }, label),
    h('input', {
      type: 'text',
      class: 'bk-form-input',
      value,
    }),
  ])
}

export default defineEditorComponent({
  id: 'form-group',
  label: 'Group',
  category: 'Form',
  component: Group,
  description:
    'Wraps a set of related form fields under an optional title. Pass form fields via the default slot.',
  variants: [
    {
      label: 'With title',
      props: {
        title: 'Address',
      },
      slots: {
        default: () => [
          formItem('Street', 'Bahnhofstrasse 1'),
          formItem('City', 'Bern'),
        ],
      },
    },
    {
      label: 'With title and addon',
      description:
        'Use the `addon` slot to render an action next to the group title.',
      props: {
        title: 'Metadata',
      },
      slots: {
        addon: () =>
          h(
            'button',
            { type: 'button', class: 'bk-button bk-is-icon bk-is-small' },
            h(Icon, { name: 'bk_mdi_help' }),
          ),
        default: () => formItem('Internal name'),
      },
    },
    {
      label: 'Horizontal',
      props: {
        title: 'Display',
        horizontal: true,
      },
      slots: {
        default: () => [formItem('Width'), formItem('Height')],
      },
    },
    {
      label: 'No title',
      props: {},
      slots: {
        default: () => formItem('Standalone field'),
      },
    },
  ],
})
