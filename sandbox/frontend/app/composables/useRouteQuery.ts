import { mapping } from '#vuepal-build/route-queries'
import type { DrupalRouteQueries } from '#vuepal-build/route-queries'

/**
 * The page's route query (vuepal's `routeQueries` in nuxt.config.ts), as
 * vuepal's `useDrupalRouteQuery()` runs it: `useDrupalRoute()` sets the
 * metatags, redirects, and hands the breadcrumb (`useBreadcrumb()`) and the
 * language links (`useLanguageLinks()`) to the layout. A route without an
 * entity is a 404.
 *
 * Unlike vuepal's, an error keeps Drupal's status: anonymous users get a 403
 * for every query, which is the private sandbox's page (app/error.vue), not a
 * 500.
 *
 * Only the page calls it, once: the layout reads what it handed on, after
 * `renderPageDependencies()`.
 */
export async function useRouteQuery<
  T extends keyof DrupalRouteQueries,
  E extends DrupalRouteQueries[T],
>(name: T) {
  const nuxtApp = useNuxtApp()
  const route = useRoute()
  // Widened to the union of query names, which useGraphqlQuery can resolve.
  const queryName = mapping[name as keyof DrupalRouteQueries]

  const fetchData = () =>
    useGraphqlQuery(queryName, { path: route.path }).then(
      (response) => response.data,
    )

  const { data, error } = await useAsyncData(
    `routeQuery-${queryName}-${route.path.replaceAll('/', '_')}`,
    fetchData,
    { deep: false },
  )

  if (error.value) {
    throw createError({
      statusCode: error.value.statusCode ?? 500,
      fatal: true,
    })
  }

  // After the await, the server has lost the Nuxt instance that useDrupalRoute()
  // needs (the starterkit has `experimental.asyncContext` for that). The ref,
  // not its value: the editor refreshes the page's data (refreshNuxtData())
  // after changing the host entity.
  const ctx = await nuxtApp.runWithContext(() =>
    useDrupalRoute<E>(
      computed(() => data.value),
      null,
      route,
    ),
  )

  const typename = data.value?.route?.__typename
  if (
    typename &&
    typename !== 'EntityCanonicalUrl' &&
    typename !== 'DefaultEntityUrl'
  ) {
    throw createError({ statusCode: 404, fatal: true })
  }

  return ctx
}
