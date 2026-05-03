/**
 * Rendered comments are stored in the simple author form
 * `<li data-type="taskItem" data-checked="…"><p>…</p></li>`. For display we
 * expand this to the full rich form (label + checkbox + content wrapper)
 * that the editor uses, so the same CSS styles both contexts and the
 * markup is ready for future non-owner toggling via an adapter method.
 *
 * Pure DOM transform; safe to call on already-enriched HTML (idempotent).
 */
export function enrichRichContent(html: string): string {
  if (!html || !html.includes('data-type="taskItem"')) {
    return html
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
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
  return doc.body.innerHTML
}
