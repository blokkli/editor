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

/** A text that a mutation sent. */
export type SentText = {
  /** `<uuid>:<fieldName>`, see {@link matchViolationsToTexts}. */
  key: string
  /** The language that the text was written in. */
  langcode?: string
}

/**
 * Find the texts that the violations of a refused mutation are about.
 *
 * The translation flows key a text as `<uuid>:<fieldName>`: the UUID of its
 * block (or of the host entity), and the name of its field or of one property
 * of it (`field_link.title`). A violation names the entity and a property
 * path (`field_title.0.value`, `field_link.0.title`), and the language of the
 * value.
 *
 * Of the texts with the same key, a violation is about the one in its
 * language. A violation in another language (that of a block whose type isn't
 * translatable) is about the first of them.
 *
 * @param violations - The violations of the refused mutation.
 * @param texts - The texts that were sent.
 * @returns What the backend said per text (the first of its violations, as
 *   plain text), and the violations that are about none of the texts.
 */
export function matchViolationsToTexts<T extends SentText>(
  violations: Validation[],
  texts: Iterable<T>,
): { messages: Map<T, string>; unmatched: Validation[] } {
  const byKey = new Map<string, T[]>()
  for (const text of texts) {
    byKey.set(text.key, [...(byKey.get(text.key) ?? []), text])
  }
  const keys = new Set(byKey.keys())
  const messages = new Map<T, string>()
  const unmatched: Validation[] = []

  for (const violation of violations) {
    const key = findTextKey(violation, keys)
    const candidates = key ? byKey.get(key)! : []
    const text =
      candidates.find(
        (candidate) => candidate.langcode === violation.langcode,
      ) ?? candidates[0]
    if (!text) {
      unmatched.push(violation)
    } else if (!messages.has(text)) {
      messages.set(text, getViolationText(violation))
    }
  }

  return { messages, unmatched }
}
