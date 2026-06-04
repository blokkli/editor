const UUID_PATTERN =
  /(?<![\w#-])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\w-])/gi

const CODE_REGION_PATTERN = /```[\s\S]*?```|`[^`\n]*`/g

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

/**
 * Replace bare block UUIDs in markdown text with clickable chips. Known UUIDs
 * become `<a class="bk-agent-block-ref" href="#uuid">label</a>`; UUIDs whose
 * block is no longer on the page become a non-clickable
 * `<span class="bk-agent-block-ref-deleted">[<deletedLabel>]</span>`.
 *
 * UUIDs inside fenced or inline code regions and UUIDs already used as a link
 * target (preceded by `#`) are left alone, so existing `[text](#uuid)` links
 * from older conversations pass through unchanged.
 */
export function linkifyBlockUuids(
  content: string,
  resolve: (uuid: string) => string | null,
  deletedLabel: string,
): string {
  if (!content) return content

  const parts: string[] = []
  let cursor = 0
  CODE_REGION_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CODE_REGION_PATTERN.exec(content)) !== null) {
    parts.push(
      replaceOutsideCode(
        content.slice(cursor, match.index),
        resolve,
        deletedLabel,
      ),
    )
    parts.push(match[0])
    cursor = match.index + match[0].length
  }
  parts.push(replaceOutsideCode(content.slice(cursor), resolve, deletedLabel))
  return parts.join('')
}

function replaceOutsideCode(
  segment: string,
  resolve: (uuid: string) => string | null,
  deletedLabel: string,
): string {
  return segment.replace(UUID_PATTERN, (uuid) => {
    const label = resolve(uuid)
    if (label === null) {
      return `<span class="bk-agent-block-ref-deleted">[${escapeHtml(deletedLabel)}]</span>`
    }
    return `<a class="bk-agent-block-ref" href="#${uuid}">${escapeHtml(label)}</a>`
  })
}
