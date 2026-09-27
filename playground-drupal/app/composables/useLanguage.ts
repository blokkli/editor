import { computed, useRoute } from '#imports'
import { DEFAULT_LANGUAGE, getLanguageFromPath } from '#shared/languages'

/**
 * The language of the current page, from its path prefix.
 */
export function useLanguage() {
  const route = useRoute()
  return computed(() => getLanguageFromPath(route.path) ?? DEFAULT_LANGUAGE)
}
