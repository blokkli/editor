import { h } from '#imports'
import { defineEditorSnippet } from '#blokkli/editor/composables'
import Pill from '#blokkli/editor/components/Pill/index.vue'
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

function row(variant: 'light' | 'normal' | 'dark') {
  return h(
    'div',
    { class: 'flex flex-wrap gap-5' },
    schemes.map((scheme) => h(Pill, { scheme, variant, text: scheme })),
  )
}

export default defineEditorSnippet({
  id: 'css-pill',
  label: 'Pill',
  category: 'CSS',
  description:
    'Compact rounded badge for status / tags. Renders via `<Pill>` with a `scheme` (any blökkli theme color) and a `variant` (`light`, `normal`, `dark`). Each variant maps to a different `bg-scheme-*` / `text-scheme-*` pairing.',
  variants: [
    {
      label: 'Light variant',
      description:
        '`variant="light"` (default) — `bg-scheme-light` with `text-scheme-dark`. Use for low-emphasis tags.',
      backgroundClass: '_bk_bg-white',
      render: () => row('light'),
    },
    {
      label: 'Normal variant',
      description:
        '`variant="normal"` — `bg-scheme-normal` with `text-scheme-text`. Use for higher-emphasis status pills.',
      backgroundClass: '_bk_bg-white',
      render: () => row('normal'),
    },
    {
      label: 'Dark variant',
      description:
        '`variant="dark"` — `bg-scheme-dark` with `text-scheme-light`. Use for the strongest emphasis.',
      backgroundClass: '_bk_bg-mono-800',
      render: () => row('dark'),
    },
  ],
})
