function convertNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(convertNode).join('')

  switch (tag) {
    case 'br':
      return '\n'
    case 'p':
    case 'div':
      return children + '\n\n'
    case 'strong':
    case 'b':
      return `**${children}**`
    case 'em':
    case 'i':
      return `*${children}*`
    case 'del':
    case 's':
      return `~~${children}~~`
    case 'code':
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return children
      }
      return `\`${children}\``
    case 'pre': {
      const codeEl = el.querySelector('code')
      const content = codeEl ? convertNode(codeEl) : children
      return `\n\`\`\`\n${content}\n\`\`\`\n`
    }
    case 'h1':
      return `# ${children}\n\n`
    case 'h2':
      return `## ${children}\n\n`
    case 'h3':
      return `### ${children}\n\n`
    case 'h4':
      return `#### ${children}\n\n`
    case 'h5':
      return `##### ${children}\n\n`
    case 'h6':
      return `###### ${children}\n\n`
    case 'a': {
      const href = el.getAttribute('href')
      return href ? `[${children}](${href})` : children
    }
    case 'ul':
    case 'ol':
      return '\n' + children + '\n'
    case 'li': {
      const parent = el.parentElement
      if (parent?.tagName.toLowerCase() === 'ol') {
        const index = Array.from(parent.children).indexOf(el) + 1
        return `${index}. ${children.trim()}\n`
      }
      return `- ${children.trim()}\n`
    }
    case 'blockquote':
      return (
        children
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n'
      )
    case 'table': {
      const rows: string[][] = []
      el.querySelectorAll('tr').forEach((tr) => {
        const cells: string[] = []
        tr.querySelectorAll('td, th').forEach((cell) => {
          cells.push(convertNode(cell).replace(/\n/g, ' ').trim())
        })
        if (cells.length) {
          rows.push(cells)
        }
      })
      if (!rows.length) return ''
      const colCount = Math.max(...rows.map((r) => r.length))
      const colWidths = Array.from({ length: colCount }, (_, i) =>
        Math.max(3, ...rows.map((r) => (r[i] || '').length)),
      )
      const formatRow = (cells: string[]) =>
        '| ' +
        colWidths.map((w, i) => (cells[i] || '').padEnd(w)).join(' | ') +
        ' |'
      const separator =
        '| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |'
      const [header, ...body] = rows
      if (!header) return ''
      const lines = [formatRow(header), separator]
      for (const row of body) {
        lines.push(formatRow(row))
      }
      return '\n' + lines.join('\n') + '\n'
    }
    case 'thead':
    case 'tbody':
    case 'tfoot':
    case 'colgroup':
    case 'col':
    case 'tr':
    case 'td':
    case 'th':
    case 'caption':
      return children
    case 'hr':
      return '\n---\n'
    case 'style':
    case 'script':
      return ''
    default:
      return children
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return convertNode(doc.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export class ClipboardData {
  private html: string
  private text: string

  constructor(data: DataTransfer) {
    this.html = data.getData('text/html')
    this.text = data.getData('text/plain')
  }

  hasHtml(): boolean {
    return !!this.html
  }

  hasText(): boolean {
    return !!this.text
  }

  /** Returns markdown converted from HTML, falling back to plain text. */
  toMarkdown(): string {
    if (this.html) {
      return htmlToMarkdown(this.html)
    }
    return this.text
  }

  /** Returns the raw plain text. */
  toText(): string {
    return this.text
  }
}
