export const LANGUAGES = ['en', 'de', 'fr'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

/**
 * The language of a path: every language has a prefix (/en, /de, /fr).
 */
export function getLanguageFromPath(path: string): Language | null {
  const prefix = path.split('/')[1]
  return isLanguage(prefix) ? prefix : null
}
