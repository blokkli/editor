/**
 * E2E outdated-translations override.
 *
 * Lets a spec mark specific block uuids as having outdated translations in
 * specific languages, by writing to `localStorage` before the editor boots.
 * The mock's `Paragraph.getTranslationState()` reads the override and merges
 * it into the block's outdated state — so the Banner counts the override'd
 * blocks and the `mark-translation-up-to-date` flow can be exercised without
 * needing to drive a multi-step "add → translate → re-edit" path through the
 * UI just to reach an outdated state.
 *
 * Override shape: `{ [blockUuid]: ['de', 'fr'] }` — the langcodes for which
 * that block should report as outdated.
 *
 * Plain TS (no Nuxt imports) so the E2E support helpers can share the storage
 * key and types with it (mirrors `permissionOverrides.ts`,
 * `translationOverride.ts`, and `testRecorder.ts`).
 */
export const OUTDATED_TRANSLATIONS_KEY = 'blokkli:test:outdatedTranslations'

export type OutdatedTranslationsOverride = Record<string, string[]>

/** Read the seeded override, or null if none. Safe to call in any environment. */
export function readOutdatedTranslationsOverride(): OutdatedTranslationsOverride | null {
  try {
    const raw = localStorage.getItem(OUTDATED_TRANSLATIONS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
