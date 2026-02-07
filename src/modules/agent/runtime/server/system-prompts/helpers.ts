import type { BlockBundleContentField } from '../../shared/types'

/**
 * Get a human-readable description of the edit mode.
 */
export function getEditModeDescription(editMode: string): string {
  switch (editMode) {
    case 'editing':
      return 'The user has full editing access and can make any changes to the page structure and content.'
    case 'translating':
      return 'The user is translating the page content. They can only edit text fields to provide translations. Structural changes (adding, deleting, moving blocks) are not allowed.'
    case 'readonly':
      return 'The user has read-only access. No changes can be made to the page. You can only answer questions about the content.'
    case 'review':
      return 'The user is reviewing the page. No changes can be made. You can only answer questions about the content.'
    default:
      return ''
  }
}

/**
 * Format a list of items as `### \`id\` - label` with optional descriptions.
 * Optionally includes intro/outro text.
 *
 * Returns null when the items array is empty.
 */
export function formatItems(
  items: { id: string; label: string; description?: string }[],
  intro?: string,
  outro?: string,
): string | null {
  if (items.length === 0) {
    return null
  }

  const lines: string[] = []

  if (intro) {
    lines.push(intro, '')
  }

  for (const item of items) {
    const heading =
      item.label && item.label !== item.id
        ? `### \`${item.id}\` - ${item.label}`
        : `### \`${item.id}\``
    lines.push(heading)
    if (item.description) {
      lines.push(item.description)
    }
    lines.push('')
  }

  if (outro) {
    lines.push(outro)
  }

  return lines.join('\n')
}

/**
 * Format a content field as a prompt line.
 */
export function formatContentField(field: BlockBundleContentField): string {
  if (field.type === 'reference' || field.type === 'link') {
    return `- ${field.name} (${field.type}): ${field.allowed.map((a) => `${a.type} [${a.bundles.join(', ')}]`).join(', ')}`
  }
  return `- ${field.name} (${field.type})`
}
