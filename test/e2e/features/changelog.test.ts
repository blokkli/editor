import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import { openAppMenu, appMenuButton } from './../support/menu'
import { dialog } from './../support/overlays'

/**
 * The changelog feature adds a "What's New" app-menu button and remembers, in
 * `storage` (localStorage key `blokkli:changelog:lastSeenVersion`), the editor
 * version the user last saw. When the current `blokkliVersion` differs from that
 * stored value — i.e. there's a new version since the editor was last opened —
 * the menu button is highlighted (`defineMenuButton` `type: 'yellow'`, surfaced
 * on the button as `data-test-type="yellow"`). Opening the changelog records the
 * current version, so the highlight is gone the next time the editor opens.
 *
 * The highlight is a `bk-scheme-yellow` class (mangled in the prod build), so we
 * assert the locale/build-stable `data-test-type` attribute instead. The current
 * version is read from `package.json` — the same source `blokkliVersion` is
 * generated from — rather than hard-coded.
 */

const LAST_SEEN_KEY = 'blokkli:changelog:lastSeenVersion'

/** The editor version `blokkliVersion` is generated from, read in Node. */
const currentVersion: string = JSON.parse(
  readFileSync(new URL('./../../../package.json', import.meta.url), 'utf8'),
).version

/** The raw stored `lastSeenVersion` (JSON string, or null if never set). */
function storedLastSeen(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), LAST_SEEN_KEY)
}

/** The changelog button's scheme (`'yellow'` when highlighted, else null). */
function changelogHighlight(page: Page): Promise<string | null> {
  return appMenuButton(page, 'changelog').getAttribute('data-test-type')
}

/** Re-open the editor in the same context (localStorage survives) — the same
 *  waits `openEditor` does. Simulates the user opening the editor again. */
async function reopenEditor(page: Page): Promise<void> {
  // `page.goto` to the same URL reloads. The base Playwright `Page` type doesn't
  // know `@nuxt/test-utils`' `'hydration'` waitUntil, and we don't need it — the
  // explicit waits below already gate on the app being mounted and the overlay
  // gone, which only happens post-hydration.
  await page.goto(page.url())
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  await page.waitForFunction(
    () => !document.querySelector('[class*="z-init-overlay"]'),
  )
}

/** Seed the stored "last seen version", then re-open so the feature reads it on
 *  mount. `null` clears it (a fresh editor that has never shown the changelog). */
async function openWithLastSeen(
  page: Page,
  value: string | null,
): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      if (value === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    },
    { key: LAST_SEEN_KEY, value },
  )
  await reopenEditor(page)
}

describe('The changelog feature', async () => {
  await setupEditorE2E()

  test('highlights the menu button when a newer version exists', async () => {
    const page = await openEditor()
    // Last seen an older version → there is something new to show.
    await openWithLastSeen(page, '0.0.0')

    await openAppMenu(page)
    await expect.poll(() => changelogHighlight(page)).toBe('yellow')

    await page.close()
  })

  test('does not highlight when the last seen version is the current one', async () => {
    const page = await openEditor()
    await openWithLastSeen(page, currentVersion)

    await openAppMenu(page)
    // The button is present but carries no highlight scheme.
    await expect.poll(() => appMenuButton(page, 'changelog').count()).toBe(1)
    expect(await changelogHighlight(page)).toBe(null)

    await page.close()
  })

  test('opening the changelog records the version and clears the highlight on next open', async () => {
    const page = await openEditor()
    // A pristine editor (never opened the changelog) treats the current version
    // as new.
    await openWithLastSeen(page, null)

    await openAppMenu(page)
    await expect.poll(() => changelogHighlight(page)).toBe('yellow')

    // Opening it shows the dialog and stamps the current version as seen.
    await appMenuButton(page, 'changelog').click()
    await dialog(page, 'changelog').waitFor({ state: 'visible' })
    expect(await storedLastSeen(page)).toBe(JSON.stringify(currentVersion))

    // Next time the editor opens, the highlight is gone.
    await reopenEditor(page)
    await openAppMenu(page)
    await expect.poll(() => appMenuButton(page, 'changelog').count()).toBe(1)
    expect(await changelogHighlight(page)).toBe(null)

    await page.close()
  })
})
