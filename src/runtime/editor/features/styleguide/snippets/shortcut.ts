import { h } from '#imports'
import { defineEditorSnippet } from '#blokkli/editor/composables'

function shortcut(keys: string[]) {
  return h(
    'div',
    { class: 'bk-shortcut' },
    keys.map((key) =>
      h('kbd', { class: key.length === 1 ? 'bk-is-single' : '' }, key),
    ),
  )
}

export default defineEditorSnippet({
  id: 'css-shortcut',
  label: 'Shortcut',
  category: 'CSS',
  description:
    'Inline keyboard shortcut representation. Use `.bk-is-single` on `<kbd>` for single-character keys.',
  variants: [
    {
      label: 'Single key',
      render: () =>
        h('div', { class: 'flex flex-wrap gap-15' }, [
          shortcut(['A']),
          shortcut(['?']),
          shortcut(['1']),
        ]),
    },
    {
      label: 'Combinations',
      render: () =>
        h('div', { class: 'flex flex-col gap-15' }, [
          shortcut(['⌘', 'K']),
          shortcut(['⇧', '⌘', 'P']),
          shortcut(['Ctrl', 'Shift', 'Z']),
          shortcut(['Esc']),
        ]),
    },
  ],
})
