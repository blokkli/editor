/**
 * E2E auto-translate mock.
 *
 * When the editor is opened with `?testing=true` AND this override is seeded in
 * `localStorage`, the mock adapter's `requestTranslation` returns a
 * deterministic, locally-computed response instead of calling the real
 * `/api/translate` endpoint (which is backed by a paid DeepL API key). E2E
 * specs MUST seed this — otherwise running the auto-translate flow burns real
 * API credit.
 *
 * The "translation" is a simple decoration of the source text — by default each
 * item is returned as `[<TARGET-LANG>] <source text>` (with `targetLanguage`
 * uppercased), which makes the rendered DOM trivially assertable
 * (`includes('[DE] ')`). Override `prefix`/`suffix` to use your own markers.
 *
 * Module is plain TS (no Nuxt imports) so the E2E support helpers can share
 * the storage key and types with it (mirrors `permissionOverrides.ts` and
 * `testRecorder.ts`).
 */
export const TRANSLATION_MOCK_KEY = 'blokkli:test:autoTranslateMock'

export interface AutoTranslateMockConfig {
  /**
   * String prepended to each item's source text in the mock response. When
   * omitted, `[<TARGET-LANG>] ` is used (e.g. `[DE] `).
   */
  prefix?: string

  /** String appended to each item's source text. Empty by default. */
  suffix?: string
}

/** Read the seeded override, or null if none. Safe to call in any environment. */
export function readAutoTranslateMock(): AutoTranslateMockConfig | null {
  try {
    const raw = localStorage.getItem(TRANSLATION_MOCK_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
