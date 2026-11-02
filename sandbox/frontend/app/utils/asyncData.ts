import type { NuxtApp } from '#app'

/**
 * getCachedData for a query that several components of a page make, such as
 * the route query in the layout and in the page: on the server, the second
 * call reuses the first one's result. Nuxt's default only does that while
 * hydrating, so the server would send the same request twice. In the browser,
 * it is Nuxt's default.
 */
export function reuseOnServer(
  key: string,
  nuxtApp: NuxtApp,
  context: { cause: string },
) {
  if (import.meta.server || nuxtApp.isHydrating) {
    return nuxtApp.payload.data[key]
  }
  if (context.cause !== 'refresh:manual' && context.cause !== 'refresh:hook') {
    return nuxtApp.static.data[key]
  }
}
