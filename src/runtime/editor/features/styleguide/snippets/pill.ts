import { h } from '#imports'
import { defineEditorSnippet } from '#blokkli/editor/composables'

const pillVariants = [
  { label: 'Default', cls: '' },
  { label: 'Mono', cls: 'bk-is-mono' },
  { label: 'Mono dark', cls: 'bk-is-mono-dark' },
  { label: 'Yellow light', cls: 'bk-is-yellow-light' },
  { label: 'Yellow dark', cls: 'bk-is-yellow-dark' },
  { label: 'Strong', cls: 'bk-is-strong' },
]

function pill(label: string, extra = '') {
  return h(
    'span',
    { class: ['bk-pill', extra].filter(Boolean).join(' ') },
    label,
  )
}

export default defineEditorSnippet({
  id: 'css-pill',
  label: 'Pill',
  category: 'CSS',
  description:
    'Compact rounded badge for status / tags. Use `.bk-pill-list` for spaced collections.',
  variants: [
    {
      label: 'Variants',
      render: () =>
        h(
          'div',
          { class: 'flex flex-wrap gap-5' },
          pillVariants.map(({ label, cls }) => pill(label, cls)),
        ),
    },
    {
      label: 'In a list',
      description:
        '`.bk-pill-list` is an `inline-flex` container with a small gap.',
      render: () =>
        h('div', { class: 'bk-pill-list' }, [
          pill('Draft', 'bk-is-mono'),
          pill('Reviewed', 'bk-is-strong'),
          pill('Stale', 'bk-is-yellow-light'),
          pill('Blocked', 'bk-is-yellow-dark'),
        ]),
    },
  ],
})
