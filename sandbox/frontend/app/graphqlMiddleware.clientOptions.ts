import { defineGraphqlClientOptions } from 'nuxt-graphql-middleware/client-options'

export default defineGraphqlClientOptions<{ language: string }>({
  // The language of the current page picks the GraphQL endpoint (see the
  // server options).
  buildClientContext() {
    return {
      language: useCurrentLanguage().value,
    }
  },
})
