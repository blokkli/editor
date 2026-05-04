/**
 * Rendered comments are stored in the simple author form
 * `<li data-type="taskItem" data-checked="…"><p>…</p></li>`. For display we
 * expand this to the full rich form (label + checkbox + content wrapper)
 * that the editor uses, so the same CSS styles both contexts and the
 * markup is ready for future non-owner toggling via an adapter method.
 *
 * Also normalises every `<a>` to open in a new window with safe `rel`.
 *
 * Pure DOM transform; safe to call on already-enriched HTML (idempotent).
 */
export function enrichRichContent(html: string): string {
  if (!html) {
    return html
  }
  const hasTaskItem = html.includes('data-type="taskItem"')
  const hasLink = html.includes('<a ')
  if (!hasTaskItem && !hasLink) {
    return html
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')

  if (hasTaskItem) {
    for (const li of doc.body.querySelectorAll('li[data-type="taskItem"]')) {
      if (li.querySelector(':scope > label')) {
        continue
      }
      const checked = li.getAttribute('data-checked') === 'true'
      const existingChildren = Array.from(li.childNodes)
      li.replaceChildren()

      const label = doc.createElement('label')
      label.setAttribute('contenteditable', 'false')
      const input = doc.createElement('input')
      input.type = 'checkbox'
      if (checked) {
        input.setAttribute('checked', 'checked')
      }
      const span = doc.createElement('span')
      label.append(input, span)

      const wrap = doc.createElement('div')
      for (const node of existingChildren) {
        wrap.appendChild(node)
      }

      li.append(label, wrap)
    }
  }

  if (hasLink) {
    for (const a of doc.body.querySelectorAll('a')) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }
  }

  return doc.body.innerHTML
}
