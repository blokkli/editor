import type { Page } from 'playwright-core'
import {
  ADAPTER_CALLS_KEY,
  type RecordedAdapterCall,
} from '../../../playground/app/mock/testRecorder'

// Read the mock adapter's recorded mutation calls. Open the editor with
// `?testing=true` to enable recording (see `playground/app/mock/testRecorder`).
// Records live in `localStorage`, so they survive the page reload a successful
// publish triggers.

/** All adapter calls recorded so far, in call order. */
export function recordedAdapterCalls<T = unknown>(
  page: Page,
): Promise<Array<RecordedAdapterCall & { args: T }>> {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  }, ADAPTER_CALLS_KEY)
}

/**
 * Wait until the adapter records a call to `method` and resolve with its args.
 * Polls `localStorage`, so it works across the publish reload. Returns the most
 * recent matching call's args.
 */
export async function waitForAdapterCall<T = unknown>(
  page: Page,
  method: string,
): Promise<T> {
  // `waitForFunction` re-evaluates across navigations, so this resolves even
  // when a successful publish reloads the page mid-wait.
  const handle = await page.waitForFunction(
    ({ key, method }) => {
      try {
        const calls = JSON.parse(localStorage.getItem(key) || '[]') as Array<{
          method: string
          args: unknown
        }>
        const match = calls.filter((c) => c.method === method).at(-1)
        return match ? match.args : null
      } catch {
        return null
      }
    },
    { key: ADAPTER_CALLS_KEY, method },
  )
  return handle.jsonValue() as Promise<T>
}
