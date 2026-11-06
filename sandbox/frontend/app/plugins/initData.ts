import type { InitDataQuery } from '#graphql-operations'

/**
 * Loads what's around every page (useInitData()) before the page: on the
 * server once per request, in the browser when the server didn't (the SPA),
 * and again when the language changes. While the next language loads, the
 * previous one's data stays.
 *
 * A failed request leaves it empty instead of failing the page: anonymous
 * users get a 403 for every query, and the pages that need Drupal show the
 * private sandbox's page through their route query (useRouteQuery()). The
 * welcome page and the design system work without Drupal.
 */
export default defineNuxtPlugin({
  name: 'sandbox:init-data',
  dependsOn: [
    'nuxt-graphql-middleware-provide-state',
    // The browser's headers for Drupal, during SSR.
    'sandbox:graphql',
    'nuxt:router',
  ],
  async setup() {
    const data = useState<InitDataQuery | null>('initData', () => null)

    async function loadInitData() {
      data.value = await useGraphqlQuery('initData')
        .then((response) => response.data)
        .catch(() => null)
    }

    if (import.meta.server) {
      await loadInitData()
    }

    if (import.meta.client) {
      if (!data.value) {
        await loadInitData()
      }
      watch(useLanguage(), loadInitData)
    }
  },
})
