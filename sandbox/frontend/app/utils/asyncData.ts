import type { NuxtApp } from '#app'

/**
 * getCachedData for a query that several components of a page make, such as
 * the route query in the layout and in the page: on the server, the second
 * call reuses the first one's result. Nuxt's default only does that while
 * hydrating, so the server would send the same request twice. In the browser,
 * Nuxt's default applies.
 */
export const reuseOnServer = import.meta.server
  ? (key: string, nuxtApp: NuxtApp) => nuxtApp.payload.data[key]
  : undefined
