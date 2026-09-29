export const LANGUAGES = ['en', 'de', 'fr'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

// Each language's name in itself, as Drupal's language switch has them.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
}

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
