import { defineGraphqlClientOptions } from 'nuxt-graphql-middleware/client-options'
import { useCurrentLanguage } from '#imports'

export default defineGraphqlClientOptions<{ language: string }>({
  // The language of the current page picks the GraphQL endpoint (see the
  // server options).
  buildClientContext() {
    return {
      language: useCurrentLanguage().value,
    }
  },
})
