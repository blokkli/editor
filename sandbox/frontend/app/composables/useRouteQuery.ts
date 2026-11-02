/**
 * The route query of the current path: the layout (layouts/drupal.vue) needs
 * its language links and the page its entity and breadcrumb. They share one
 * request.
 */
export function useRouteQuery() {
  const route = useRoute()
  return useAsyncGraphqlQuery(
    'route',
    computed(() => ({ path: route.path })),
    { getCachedData: reuseOnServer },
  )
}
