import { defineEditorComponent } from '#blokkli/editor/composables'
import { h } from 'vue'
import RadioBox from './index.vue'

export default defineEditorComponent({
  id: 'form-radio-box',
  label: 'RadioBox',
  category: 'Form',
  component: RadioBox,
  description:
    'A boxed radio option with a title and an optional description. Renders the standard `bk-radio` circle on the left and content on the right. Both the title and description can be replaced via slots, and the default slot accepts arbitrary content (pills, badges, sub-lines) below the description. Group multiple boxes by sharing the same `name` and binding all of them to the same v-model.',
  variants: [
    {
      label: 'Default',
      description:
        'Just a `title`. The `value` distinguishes this option from siblings; `modelValue` decides which one is selected.',
      props: {
        name: 'demo-default',
        value: 'one',
        title: 'Lorem ipsum dolor',
        modelValue: 'one',
      },
    },
    {
      label: 'With description',
      props: {
        name: 'demo-desc',
        value: 'two',
        title: 'Quick build',
        description: 'Skip the optimisation pass. Faster, slightly larger output.',
        modelValue: 'two',
      },
    },
    {
      label: 'Unselected',
      props: {
        name: 'demo-unselected',
        value: 'three',
        title: 'Standard layout',
        description: 'Default rendering with the inactive border.',
        modelValue: 'other',
      },
    },
    {
      label: 'Disabled',
      props: {
        name: 'demo-disabled',
        value: 'four',
        title: 'Locked option',
        description: 'You do not have permission to pick this.',
        disabled: true,
        modelValue: 'four',
      },
    },
    {
      label: 'Title slot',
      description:
        'Override the title slot to inject inline secondary text (e.g. an id) next to the main title.',
      props: {
        name: 'demo-title-slot',
        value: 'five',
        title: 'Fallback title',
        modelValue: 'five',
      },
      slots: {
        title: () =>
          h('span', { class: 'truncate' }, [
            'Marketing landing page',
            h('span', { class: 'font-normal text-mono-500' }, ' #4821'),
          ]),
      },
    },
    {
      label: 'Default slot (pills)',
      description:
        'Use the default slot to render arbitrary content under the title — a pill list, badges, a sub-component, etc.',
      props: {
        name: 'demo-default-slot',
        value: 'six',
        title: 'Quarterly report draft',
        modelValue: 'six',
      },
      slots: {
        default: () =>
          h('ul', { class: 'bk-pill-list mt-3' }, [
            h('li', [h('span', { class: 'bk-pill bk-is-mono' }, 'Document')]),
            h('li', [
              h('span', { class: 'bk-pill bk-is-yellow-light' }, '2 days ago'),
            ]),
            h('li', [h('span', { class: 'bk-pill' }, 'Owner')]),
          ]),
      },
    },
    {
      label: 'Description slot',
      description: 'Replace the description with rich markup.',
      props: {
        name: 'demo-desc-slot',
        value: 'seven',
        title: 'API integration',
        modelValue: 'seven',
      },
      slots: {
        description: () =>
          h('span', [
            'Connects to ',
            h('code', { class: 'text-mono-700' }, '/api/v2/items'),
            ' on save.',
          ]),
      },
    },
  ],
})
