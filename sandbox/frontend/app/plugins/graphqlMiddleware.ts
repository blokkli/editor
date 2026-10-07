/**
 * During SSR, queries go from the app to the GraphQL proxy without the
 * browser's headers. Pass them on, so that Drupal sees the right host.
 */
export default defineNuxtPlugin({
  name: 'sandbox:graphql',
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    if (!import.meta.server) {
      return
    }
    const state = useGraphqlState()
    if (state) {
      state.fetchOptions.headers = pickForwardedHeaders(
        useRequestHeaders([...FORWARDED_HEADERS]),
      )
    }
  },
})
