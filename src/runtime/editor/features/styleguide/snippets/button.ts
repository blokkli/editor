import { h } from '#imports'
import { defineEditorSnippet } from '#blokkli/editor/composables'
import { Icon } from '#blokkli/editor/components'

const variants = [
  { label: 'Default', cls: '' },
  { label: 'Primary', cls: 'bk-is-primary' },
  { label: 'Teal', cls: 'bk-is-teal' },
  { label: 'Orange', cls: 'bk-is-orange' },
  { label: 'Lime', cls: 'bk-is-lime' },
  { label: 'Lime outline', cls: 'bk-is-lime-outline' },
  { label: 'Danger', cls: 'bk-is-danger' },
  { label: 'Warning', cls: 'bk-is-warning' },
  { label: 'Warning dark', cls: 'bk-is-warning-dark' },
  { label: 'Warning outline dark', cls: 'bk-is-warning-outline-dark' },
  { label: 'White', cls: 'bk-is-white' },
  { label: 'Scheme', cls: 'bk-is-scheme' },
  { label: 'Scheme outline', cls: 'bk-is-scheme-outline' },
]

function button(label: string, extra = '') {
  return h(
    'button',
    {
      type: 'button',
      class: ['bk-button', extra].filter(Boolean).join(' '),
    },
    label,
  )
}

function iconButton(extra = '') {
  return h(
    'button',
    {
      type: 'button',
      class: ['bk-button bk-is-icon-only', extra].filter(Boolean).join(' '),
      'aria-label': 'Add',
    },
    h(Icon, { name: 'bk_mdi_add' }),
  )
}

export default defineEditorSnippet({
  id: 'css-button',
  label: 'Button',
  category: 'CSS',
  description:
    'The `.bk-button` base class with semantic and color modifiers. Combine modifiers like `.bk-is-fullwidth`, `.bk-is-small` or `.bk-is-icon-only`.',
  variants: [
    {
      label: 'Color variants',
      render: () =>
        h(
          'div',
          { class: 'flex flex-wrap gap-10' },
          variants.map(({ label, cls }) => button(label, cls)),
        ),
    },
    {
      label: 'Disabled',
      description:
        'Add the `disabled` attribute. Each variant has its own disabled treatment.',
      render: () =>
        h(
          'div',
          { class: 'flex flex-wrap gap-10' },
          variants.map(({ label, cls }) =>
            h(
              'button',
              {
                type: 'button',
                class: ['bk-button', cls].filter(Boolean).join(' '),
                disabled: true,
              },
              label,
            ),
          ),
        ),
    },
    {
      label: 'Sizes',
      description: 'Add `.bk-is-small` to shrink padding and font size.',
      render: () =>
        h('div', { class: 'flex items-center flex-wrap gap-10' }, [
          button('Default', 'bk-is-primary'),
          button('Small', 'bk-is-primary bk-is-small'),
        ]),
    },
    {
      label: 'Icon only',
      description: 'Use `.bk-is-icon-only` for a square button.',
      render: () =>
        h('div', { class: 'flex items-center flex-wrap gap-10' }, [
          iconButton('bk-is-primary'),
          iconButton('bk-is-primary bk-is-small'),
          iconButton('bk-is-danger'),
        ]),
    },
    {
      label: 'With icon',
      render: () =>
        h('div', { class: 'flex items-center flex-wrap gap-10' }, [
          h('button', { type: 'button', class: 'bk-button bk-is-primary' }, [
            h(Icon, { name: 'bk_mdi_save' }),
            'Save',
          ]),
          h('button', { type: 'button', class: 'bk-button bk-is-danger' }, [
            h(Icon, { name: 'bk_mdi_delete' }),
            'Delete',
          ]),
        ]),
    },
    {
      label: 'Full width',
      description: 'Add `.bk-is-fullwidth` to stretch to the container.',
      render: () =>
        h('div', { class: 'flex flex-col gap-10 w-full max-w-[400px]' }, [
          button('Default', 'bk-is-fullwidth'),
          button('Primary', 'bk-is-primary bk-is-fullwidth'),
        ]),
    },
    {
      label: 'Loading',
      description:
        '`.bk-is-loading` swaps the label for a spinner; the button is non-interactive.',
      render: () =>
        h('div', { class: 'flex flex-wrap gap-10' }, [
          button('Saving', 'bk-is-primary bk-is-loading'),
          button('Deleting', 'bk-is-danger bk-is-loading'),
        ]),
    },
  ],
})
