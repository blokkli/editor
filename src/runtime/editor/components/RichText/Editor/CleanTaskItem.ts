import TaskItem from '@tiptap/extension-task-item'

/**
 * TaskItem variant that serializes to the simple author form
 * `<li data-type="taskItem" data-checked="…"><p>…</p></li>` instead of
 * TipTap's default verbose form (which embeds the editor's checkbox UI in
 * the HTML output). The verbose form is recreated for in-editor display via
 * the NodeView below, so the editing experience is identical to the
 * default TaskItem — but `editor.getHTML()` returns clean, persistable HTML
 * with no editor cruft.
 */
export const CleanTaskItem = TaskItem.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      'li',
      {
        ...HTMLAttributes,
        'data-type': 'taskItem',
        'data-checked': node.attrs.checked ? 'true' : 'false',
      },
      0,
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const li = document.createElement('li')
      li.setAttribute('data-type', 'taskItem')
      li.setAttribute('data-checked', node.attrs.checked ? 'true' : 'false')

      const label = document.createElement('label')
      label.setAttribute('contenteditable', 'false')
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = !!node.attrs.checked
      const span = document.createElement('span')
      label.append(input, span)

      const content = document.createElement('div')

      li.append(label, content)

      input.addEventListener('change', () => {
        if (typeof getPos !== 'function') {
          return
        }
        const pos = getPos()
        if (pos == null) {
          return
        }
        editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              checked: input.checked,
            })
            return true
          })
          .run()
      })

      return {
        dom: li,
        contentDOM: content,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) {
            return false
          }
          const checked = !!updatedNode.attrs.checked
          li.setAttribute('data-checked', checked ? 'true' : 'false')
          input.checked = checked
          return true
        },
      }
    }
  },
})
