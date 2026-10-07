import { defineGraphqlClientOptions } from 'nuxt-graphql-middleware/client-options'

export default defineGraphqlClientOptions<{ language: string }>({
  // The language of the current page picks the GraphQL endpoint (see the
  // server options).
  buildClientContext() {
    return {
      // The server's typecheck also checks this file, with the server's
      // auto-imports: nuxt-graphql-middleware types the client context from
      // it. There, useCurrentLanguage is the server util, which takes an
      // event. This code only runs in the app.
      // @ts-ignore
      language: useCurrentLanguage().value,
    }
  },
})
