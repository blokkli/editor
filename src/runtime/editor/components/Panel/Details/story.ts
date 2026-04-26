import { defineEditorComponent } from '#blokkli/editor/composables'
import { h } from 'vue'
import Details from './index.vue'

export default defineEditorComponent({
  id: 'panel-details',
  label: 'Details',
  category: 'Panels',
  component: Details,
  backgroundClass: '_bk_bg-mono-200',
  description:
    'Collapsible section with a clickable header (title + optional description) that toggles the body. The open state is exposed via `v-model`, so the parent can persist or coordinate it across multiple `Details`. The body slot animates in and out via `<TransitionHeight>`.',
  variants: [
    {
      label: 'Closed (default)',
      props: { title: 'Advanced settings' },
      slots: {
        default: () => h('div', 'Body content shown when expanded.'),
      },
    },
    {
      label: 'Open',
      description: 'Bound `modelValue: true` opens the body on render.',
      props: { title: 'Advanced settings', modelValue: true },
      slots: {
        default: () => h('div', 'Body content shown when expanded.'),
      },
    },
    {
      label: 'With description',
      description:
        'A secondary description line renders below the title in the toggle button.',
      props: {
        title: 'Snapping',
        description: 'Align new geometry to existing features.',
        modelValue: true,
      },
      slots: {
        default: () =>
          h(
            'div',
            'Configure tolerance, layers, and which feature types to snap to.',
          ),
      },
    },
    {
      label: 'Rich body content',
      description: 'The default slot accepts any content.',
      props: { title: 'Layer style', modelValue: true },
      slots: {
        default: () =>
          h('div', [
            h('label', { class: 'flex items-center gap-8 text-sm' }, [
              h('input', { type: 'checkbox', checked: true }),
              'Show labels',
            ]),
            h('label', { class: 'flex items-center gap-8 text-sm' }, [
              h('input', { type: 'checkbox' }),
              'Show outline',
            ]),
            h('label', { class: 'flex items-center gap-8 text-sm' }, [
              h('input', { type: 'checkbox', checked: true }),
              'Show fill',
            ]),
          ]),
      },
    },
  ],
})
