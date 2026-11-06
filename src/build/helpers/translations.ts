/**
 * A text of the editor and its translations, for a `DefinitionString`.
 *
 * @param key - The text's key.
 * @param text - The English text.
 * @param translations - The editor's texts, keyed by language.
 *
 * @returns The English text and every non-empty translation, keyed by
 * language.
 */
export function translateText(
  key: string,
  text: string,
  translations: Record<string, Record<string, string>>,
): Record<string, string> {
  const result: Record<string, string> = { en: text }
  for (const [langcode, texts] of Object.entries(translations)) {
    const translation = texts[key]
    if (translation) {
      result[langcode] = translation
    }
  }
  return result
}
