/**
 * The editorial page of the current route: the front page (pages/index.vue),
 * or the node that frontend_routing's settings assign to a frontend route
 * (FrontendRoute). A 404 without one.
 */
export async function useEditorialRoute() {
  const { entity } = await useRouteQuery('nodeEditorial')

  const node = computed(() =>
    entity.value?.__typename === 'NodeEditorial' ? entity.value : null,
  )
  if (!node.value) {
    throw createError({ statusCode: 404, fatal: true })
  }
  return node
}
