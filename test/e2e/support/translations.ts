import {
  TRANSLATION_MOCK_KEY,
  type AutoTranslateMockConfig,
} from '../../../playground/app/mock/translationOverride'

/**
 * Build the `openEditor({ localStorage })` entry that puts the mock adapter's
 * `requestTranslation` into deterministic-mock mode. Specs MUST pass this when
 * exercising the auto-translate flow — otherwise the adapter falls through to
 * the real `/api/translate` endpoint (paid DeepL).
 *
 * Default behaviour: each item is returned as `[<TARGET-LANG>] <source text>`,
 * making the rendered DOM trivially assertable (`includes('[DE] ')`). Pass
 * `prefix`/`suffix` to use your own marker.
 *
 * @example
 * const page = await openEditor(
 *   '/de/page/1?blokkliEditing=1&testing=true',
 *   { localStorage: autoTranslateMockEntry() },
 * )
 */
export function autoTranslateMockEntry(
  config: AutoTranslateMockConfig = {},
): Record<string, string> {
  return { [TRANSLATION_MOCK_KEY]: JSON.stringify(config) }
}
