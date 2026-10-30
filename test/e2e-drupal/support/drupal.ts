import { execFileSync } from 'node:child_process'
import type { Page } from 'playwright-core'
import { ROOT } from './sandbox'

export type DrupalAnswer = {
  data?: Record<string, unknown> | null
  errors?: { path?: string[] }[]
}

/** Quotes a value for the shell of `ddev exec`. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/**
 * Asks Drupal's GraphQL endpoint directly, as the user of the page. nginx
 * refuses Drupal's endpoint to the browser on a sandbox's host, but Drupal has
 * to refuse what a user may not do by itself: Nuxt's server passes the
 * browser's cookie on with every operation of the app. So this asks the way
 * Nuxt's server does, from inside the container.
 */
export async function askDrupal(
  page: Page,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<DrupalAnswer> {
  const url = new URL(page.url())
  const cookies = await page.context().cookies(url.origin)
  const command = [
    'curl',
    '-s',
    '-X',
    'POST',
    'http://127.0.0.1/en/graphql',
    '-H',
    'Content-Type: application/json',
    '-H',
    `X-Forwarded-Host: ${url.host}`,
    '-H',
    'X-Forwarded-Proto: https',
    '-H',
    `Cookie: ${cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')}`,
    '--data-binary',
    '@-',
  ]
    .map(shellQuote)
    .join(' ')
  const output = execFileSync('ddev', ['exec', command], {
    cwd: ROOT,
    input: JSON.stringify({ query, variables }),
  })
  return JSON.parse(output.toString())
}
