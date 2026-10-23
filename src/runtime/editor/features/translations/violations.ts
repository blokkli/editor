import type { Validation } from '#blokkli/editor/types/state'
import { parseHtmlDocument } from '#blokkli/editor/helpers/html'

/**
 * What a violation says, as plain text.
 *
 * A backend may send markup: Drupal emphasises the names it puts into a
 * message (`<em class="placeholder">Title</em>: may not be longer than…`).
 */
export function getViolationText(violation: Validation): string {
  // A parsed document is inert: nothing in the message is loaded or run.
  const body = parseHtmlDocument(violation.message).body
  return (body.textContent ?? '').trim()
}

/**
 * The key of the text that a violation is about, if it is one of `keys`.
 */
function findTextKey(
  violation: Validation,
  keys: Set<string>,
): string | undefined {
  if (!violation.entityUuid || !violation.propertyPath) {
    return undefined
  }

  const parts = violation.propertyPath.split('.')
  const fieldName = parts[0]
  if (!fieldName) {
    return undefined
  }

  // A property that is a text of its own (`field_link.title`) comes first.
  const property = parts.length > 1 ? parts[parts.length - 1] : undefined
  const candidates = [
    property ? `${violation.entityUuid}:${fieldName}.${property}` : undefined,
    `${violation.entityUuid}:${fieldName}`,
  ]

  return candidates.find((key) => key !== undefined && keys.has(key))
}

/**
 * Find the texts that the violations of a refused mutation are about.
 *
 * The translation flows key a text as `<uuid>:<fieldName>`: the UUID of its
 * block (or of the host entity), and the name of its field or of one property
 * of it (`field_link.title`). A violation names the entity and a property
 * path (`field_title.0.value`, `field_link.0.title`).
 *
 * @param violations - The violations of the refused mutation.
 * @param keys - The keys of the texts that were sent.
 * @returns What the backend said per text (the first of its violations, as
 *   plain text), and the violations that are about none of the texts.
 */
export function matchViolationsToTexts(
  violations: Validation[],
  keys: Iterable<string>,
): { messages: Map<string, string>; unmatched: Validation[] } {
  const known = new Set(keys)
  const messages = new Map<string, string>()
  const unmatched: Validation[] = []

  for (const violation of violations) {
    const key = findTextKey(violation, known)
    if (!key) {
      unmatched.push(violation)
    } else if (!messages.has(key)) {
      messages.set(key, getViolationText(violation))
    }
  }

  return { messages, unmatched }
}
