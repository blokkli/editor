import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import drupalGraphlMiddlewareAdapter from '#blokkli/adapter/drupal/graphqlMiddleware'

export default defineBlokkliEditAdapter((providedContext) => {
  const baseAdapter = drupalGraphlMiddlewareAdapter(providedContext)
  return baseAdapter
})
