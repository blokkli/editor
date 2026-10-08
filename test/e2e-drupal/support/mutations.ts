import type { Page } from 'playwright-core'
import type { Mutation } from '#nuxt-graphql-middleware/operation-types'

/**
 * Waits for the next request of a GraphQL mutation and returns its variables:
 * nuxt-graphql-middleware posts them as the request body. What the mock
 * suite's adapter recorder was for. With `matches`, it waits for the next one
 * whose variables match.
 *
 * Start it before the action and await it after. It resolves once Drupal has
 * answered, so a reload then shows what Drupal stored. It also works when the
 * mutation navigates away (publishing): only the response body is lost then.
 *
 * ```ts
 * const variables = nextMutation(page, 'pbUpdateParagraphOption')
 * await setOption(page, …)
 * expect(await variables).toMatchObject({ … })
 * ```
 */
export async function nextMutation<K extends keyof Mutation & string>(
  page: Page,
  name: K,
  matches: (variables: Mutation[K]['variables']) => boolean = () => true,
): Promise<Mutation[K]['variables']> {
  const path = `/api/graphql_middleware/mutation/${name}`
  const response = await page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path &&
      matches(response.request().postDataJSON()),
  )
  return response.request().postDataJSON()
}
