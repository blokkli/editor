import type { PageState } from '../../shared/types'

/**
 * Build the `[Editor context …]` note announcing volatile editor-state changes
 * to the LLM. Prepended to user-written messages only (never tool relays or
 * synthesized `[System: …]` turns), before the selection marker.
 *
 * Two shapes:
 * - `baselineUnknown` (a conversation was just restored — its history may have
 *   been written under a different mode or language): a full statement of the
 *   current state, regardless of any diff.
 * - Otherwise a diff against `prev` — what the LLM was last told. `title` is
 *   merged into the page context but never announced; the system prompt covers
 *   it. Returns null when nothing announceable changed (or when there is no
 *   baseline to diff against, e.g. the first message of a fresh conversation).
 */
export function formatPageStateNote(
  prev: PageState | undefined,
  next: PageState,
  opts: { baselineUnknown: boolean },
): string | null {
  if (opts.baselineUnknown) {
    const published =
      next.isPublished === null
        ? ''
        : next.isPublished
          ? ' The page is currently published.'
          : ' The page is currently not published.'
    return `[Editor context: edit mode is "${next.editMode}", content language is "${next.entityLanguage}".${published} Earlier messages in this conversation may have been written in a different context.]`
  }

  if (!prev) {
    return null
  }

  const changes: string[] = []

  if (prev.editMode !== next.editMode) {
    changes.push(`edit mode is now "${next.editMode}" (was "${prev.editMode}")`)
  }

  if (prev.entityLanguage !== next.entityLanguage) {
    changes.push(
      `content language is now "${next.entityLanguage}" (was "${prev.entityLanguage}")`,
    )
  }

  if (prev.isPublished !== next.isPublished && next.isPublished !== null) {
    changes.push(
      next.isPublished
        ? 'the page is now published'
        : 'the page is now unpublished',
    )
  }

  if (!changes.length) {
    return null
  }

  return `[Editor context changed: ${changes.join('; ')}.]`
}
