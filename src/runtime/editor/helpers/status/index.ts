import type { TranslationState } from '#blokkli/editor/types/state'

/**
 * What the page's publish status covers.
 *
 * - `language`: each translation has a status of its own.
 * - `all-languages`: every translation shares one status.
 * - `page`: the page has one language, or the backend doesn't say.
 */
export type StatusScope = 'language' | 'all-languages' | 'page'

export function getStatusScope(translation: TranslationState): StatusScope {
  if (
    !translation.isTranslatable ||
    (translation.availableLanguages?.length ?? 0) < 2
  ) {
    return 'page'
  }

  if (translation.isStatusTranslatable === true) {
    return 'language'
  } else if (translation.isStatusTranslatable === false) {
    return 'all-languages'
  }

  return 'page'
}
