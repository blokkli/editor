import { h } from '#imports'
import { defineEditorSnippet } from '#blokkli/editor/composables'
import Button from '#blokkli/editor/components/Button/index.vue'
import { Icon } from '#blokkli/editor/components'
import type { ThemeColorName } from './../../../../../global/types/theme'

const schemes: ThemeColorName[] = [
  'accent',
  'mono',
  'teal',
  'yellow',
  'red',
  'lime',
  'orange',
]

type Variant = 'normal' | 'light' | 'dark' | 'outline' | 'outline-dark'

function row(variant: Variant, extra: Record<string, unknown> = {}) {
  return h(
    'div',
    { class: 'flex flex-wrap gap-10' },
    schemes.map((scheme) =>
      h(Button, { scheme, variant, label: scheme, ...extra }),
    ),
  )
}

export default defineEditorSnippet({
  id: 'css-button',
  label: 'Button',
  category: 'CSS',
  description:
    'The `.bk-button` base class. Color comes from `bk-scheme-*` (set on the button itself) combined with a variant modifier: default (`bk-scheme-normal` background), `.bk-is-light`, `.bk-is-dark`, or `.bk-is-outline`. Size is controlled with `.bk-is-small`; layout helpers `.bk-is-icon-only`, `.bk-is-fullwidth`, `.bk-is-loading`.',
  variants: [
    {
      label: 'Normal variant',
      description:
        'Default — `bg-scheme-normal` with `text-scheme-text`. No modifier needed.',
      backgroundClass: '_bk_bg-white',
      render: () => row('normal'),
    },
    {
      label: 'Light variant',
      description: '`.bk-is-light` — `bg-scheme-light` with `text-scheme-dark`.',
      backgroundClass: '_bk_bg-white',
      render: () => row('light'),
    },
    {
      label: 'Dark variant',
      description: '`.bk-is-dark` — `bg-scheme-dark` with `text-scheme-light`.',
      backgroundClass: '_bk_bg-mono-800',
      render: () => row('dark'),
    },
    {
      label: 'Outline variant',
      description:
        '`.bk-is-outline` — transparent background with a `scheme-normal` outline and text.',
      backgroundClass: '_bk_bg-white',
      render: () => row('outline'),
    },
    {
      label: 'Outline + dark variant',
      description:
        '`.bk-is-outline.bk-is-dark` — transparent background with a `scheme-dark` outline and text. Use on saturated backgrounds where `scheme-normal` blends in.',
      backgroundClass: '_bk_bg-white',
      render: () => row('outline-dark'),
    },
    {
      label: 'Sizes',
      description: 'Add `.bk-is-small` to shrink padding and font size.',
      render: () =>
        h('div', { class: 'flex items-center flex-wrap gap-10' }, [
          h(Button, { scheme: 'accent', label: 'Default' }),
          h(Button, { scheme: 'accent', size: 'small', label: 'Small' }),
        ]),
    },
    {
      label: 'Disabled',
      description: 'Add the `disabled` attribute. All variants dim to 30%.',
      render: () =>
        h('div', { class: 'flex flex-col gap-10' }, [
          row('normal', { disabled: true }),
          row('light', { disabled: true }),
          row('outline', { disabled: true }),
        ]),
    },
    {
      label: 'Icon only',
      description: 'Use `.bk-is-icon-only` for a square button.',
      render: () =>
        h('div', { class: 'flex items-center flex-wrap gap-10' }, [
          h(
            Button,
            { scheme: 'accent', iconOnly: true, 'aria-label': 'Add' },
            { default: () => h(Icon, { name: 'bk_mdi_add' }) },
          ),
          h(
            Button,
            {
              scheme: 'accent',
              iconOnly: true,
              size: 'small',
              'aria-label': 'Add',
            },
            { default: () => h(Icon, { name: 'bk_mdi_add' }) },
          ),
          h(
            Button,
            { scheme: 'red', iconOnly: true, 'aria-label': 'Delete' },
            { default: () => h(Icon, { name: 'bk_mdi_delete' }) },
          ),
        ]),
    },
    {
      label: 'With icon',
      render: () =>
        h('div', { class: 'flex items-center flex-wrap gap-10' }, [
          h(
            Button,
            { scheme: 'accent' },
            {
              default: () => [h(Icon, { name: 'bk_mdi_save' }), 'Save'],
            },
          ),
          h(
            Button,
            { scheme: 'red' },
            {
              default: () => [h(Icon, { name: 'bk_mdi_delete' }), 'Delete'],
            },
          ),
        ]),
    },
    {
      label: 'Full width',
      description: 'Add `.bk-is-fullwidth` to stretch to the container.',
      render: () =>
        h('div', { class: 'flex flex-col gap-10 w-full max-w-[400px]' }, [
          h(Button, { scheme: 'mono', fullwidth: true, label: 'Default' }),
          h(Button, { scheme: 'accent', fullwidth: true, label: 'Accent' }),
        ]),
    },
    {
      label: 'Loading',
      description:
        '`.bk-is-loading` swaps the label for a spinner; the button is non-interactive.',
      render: () =>
        h('div', { class: 'flex flex-wrap gap-10' }, [
          h(Button, { scheme: 'accent', loading: true, label: 'Saving' }),
          h(Button, { scheme: 'red', loading: true, label: 'Deleting' }),
        ]),
    },
  ],
})
