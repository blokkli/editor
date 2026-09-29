import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { isDrupalPath } from '../../playground-drupal/app/helpers/drupalPath'

// playground-drupal's links follow nginx: `ddev check-routes` lists which
// upstream serves each path, and isDrupalPath() has to agree.
const routes = [
  ...readFileSync(
    new URL('../../.ddev/commands/host/check-routes', import.meta.url),
    'utf8',
  ).matchAll(/^\s+"(\S+) (nuxt|drupal)"$/gm),
].map(([, path, upstream]) => ({ path: path!, upstream: upstream! }))

describe('isDrupalPath', () => {
  test('reads the routes', () => {
    expect(routes.length).toBeGreaterThan(30)
  })

  test.each(routes)('$path: $upstream', ({ path, upstream }) => {
    expect(isDrupalPath(path)).toBe(upstream === 'drupal')
  })
})
