import { defineGraphqlClientOptions } from 'nuxt-graphql-middleware/client-options'
import { useRouter } from '#imports'
import { DEFAULT_LANGUAGE, getLanguageFromPath } from '#shared/languages'

export default defineGraphqlClientOptions<{ language: string }>({
  // The language of the current page picks the GraphQL endpoint (see the
  // server options).
  buildClientContext() {
    const path = useRouter().currentRoute.value.path
    return {
      language: getLanguageFromPath(path) ?? DEFAULT_LANGUAGE,
    }
  },
})
