import { useCurrentLanguage } from '#imports'

/**
 * The language of the current page, as nuxt-language-negotiation negotiated
 * it from the path's prefix.
 */
export function useLanguage() {
  return useCurrentLanguage()
}
