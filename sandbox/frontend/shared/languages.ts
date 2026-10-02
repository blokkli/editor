export const LANGUAGES = ['en', 'de', 'fr'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

// Each language's name in itself, as Drupal's language switch has them.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
}

// The locale for dates, times and lists formatted in the frontend: British
// English and Swiss German and French, like the content.
export const LOCALES: Record<Language, string> = {
  en: 'en-GB',
  de: 'de-CH',
  fr: 'fr-CH',
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
