import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { captureClipboard, copiedText } from '../../support/clipboard'
import {
  closeViewOptions,
  openViewOptions,
  viewOption,
} from '../../support/toolbar'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, revertAllChanges } from '../../support/session'

/**
 * The anchors feature is a toolbar view option (`anchor`). When enabled it scans
 * the rendered page for elements with an `id`, finds the owning block and draws a
 * left-edge indicator showing `#<id>`. Clicking the indicator copies a link —
 * `adapter.buildAnchorLink(id, uuid)`, which the Drupal adapter always has: the
 * entity's link path and `#<id>`. The overlay recomputes its items on mount and on
 * every `state:reloaded`, so it tracks block add/delete/option changes. Each
 * frame, the indicator is positioned at its block's artboard Y, snapped to a
 * 30px grid (`snapToAnchorGrid`), inside a container carrying the artboard
 * transform.
 *
 * The sandbox's `title` renders its heading with an `id`: its option `anchor`
 * (type `text`), or else its title as a slug. A new title has no title, so its
 * anchor alone gives it an id.
 *
 * Notes that shape these tests:
 *  - Anchor indicators render to the LEFT of their block, so for a block at the
 *    canvas's left edge the indicator sits off-screen (negative x). Its handler
 *    is just `@click="$emit('click')"`, so we dispatch a `click` event directly;
 *    that event is untrusted, so `clipboard.writeText` rejects silently and we
 *    wrap it to capture what the feature copies.
 *  - `adapter.addNewBlock({ afterUuid: null })` PREPENDS (inserts at index 0), so
 *    ordering tests pass an explicit `afterUuid`.
 *  - The overlay scans on mount, so when adding a block then toggling anchors on
 *    we first wait for the anchored element to actually be in the DOM.
 */

const ANCHOR = 'my-section'

/** Shorthand for the anchors view-option button (requires the dropdown open). */
function anchorViewOption(page: Page): Locator {
  return viewOption(page, 'anchor')
}

function anchorIndicator(page: Page, uuid: string): Locator {
  return page.locator(
    `[data-test-block-indicator="anchor"][data-test-uuid="${uuid}"]`,
  )
}

/** Add a paragraph to `field_paragraphs`. `afterUuid` controls ordering (a
 * null/omitted value prepends). Returns the new paragraph's uuid. */
async function addContentBlock(
  page: Page,
  bundle: string,
  afterUuid?: string,
): Promise<string> {
  const uuid = await page.evaluate(
    async ({ bundle, afterUuid }) => {
      const app = window.__BLOKKLI__!.app!
      const before = new Set(app.state.getAllUuids())
      await app.state.mutateWithLoadingState(() =>
        app.adapter.addNewBlock({
          bundle,
          host: {
            type: app.context.value.entityType,
            uuid: app.context.value.entityUuid,
            fieldName: 'field_paragraphs',
          },
          afterUuid: afterUuid ?? null,
        }),
      )
      return app.state.getAllUuids().find((u) => !before.has(u)) ?? null
    },
    { bundle, afterUuid },
  )
  if (!uuid) {
    throw new Error(`Failed to add a "${bundle}" paragraph`)
  }
  return uuid
}

/** Set a title's `anchor` option (it becomes the heading's `id`). */
function setAnchor(page: Page, uuid: string, value: string): Promise<void> {
  return page.evaluate(
    async ({ uuid, value }) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.updateOptions!([{ uuid, key: 'anchor', value }]),
      )
    },
    { uuid, value },
  )
}

/** Add a `title` with the given anchor. */
async function addAnchored(
  page: Page,
  anchor: string,
  afterUuid?: string,
): Promise<string> {
  const uuid = await addContentBlock(page, 'title', afterUuid)
  await setAnchor(page, uuid, anchor)
  return uuid
}

function deleteBlock(page: Page, uuid: string): Promise<void> {
  return page.evaluate(async (uuid) => {
    const app = window.__BLOKKLI__!.app!
    await app.state.mutateWithLoadingState(() =>
      app.adapter.deleteBlocks!([uuid]),
    )
  }, uuid)
}

/** Enable the anchors view option. If `waitForElementId` is given, wait for that
 * anchored element to be in the DOM first so the overlay's mount scan sees it.
 * Opens the view-options dropdown if it's not already open. */
async function enableAnchors(
  page: Page,
  waitForElementId?: string,
): Promise<void> {
  if (waitForElementId) {
    await page.waitForFunction(
      (id) => Boolean(document.getElementById(id)),
      waitForElementId,
    )
  }
  await openViewOptions(page)
  // The `anchor` view option defaults to ON, and its state persists in
  // storage, so the button may already be active — only click when it isn't,
  // otherwise a blind toggle would turn anchors OFF.
  if (
    (await anchorViewOption(page).getAttribute('data-test-active')) !== 'true'
  ) {
    await anchorViewOption(page).click()
  }
}

/** The indicator's current `translateY` (px), or null if not positioned yet. */
function indicatorTranslateY(page: Page, uuid: string): Promise<number | null> {
  return page.evaluate((uuid) => {
    const el = document.querySelector(
      `[data-test-block-indicator="anchor"][data-test-uuid="${uuid}"]`,
    )
    // Indicators are positioned with `translate(<x>px, <y>px)` (see
    // Indicators/index.vue) — extract the Y component.
    const match = (el as HTMLElement | null)?.style.transform.match(
      /translate\([-\d.]+px,\s*([-\d.]+)px\)/,
    )
    return match ? Number(match[1]) : null
  }, uuid)
}

/** The block's artboard Y snapped to the 30px anchor grid — i.e. exactly where
 * the indicator should sit (`snapToAnchorGrid(round(rect.y))`). */
function blockSnappedY(page: Page, uuid: string): Promise<number | null> {
  return page.evaluate((uuid) => {
    const rect = window.__BLOKKLI__!.app!.dom.getBlockRect(uuid, true)
    return rect ? Math.ceil(Math.round(rect.y) / 30) * 30 : null
  }, uuid)
}

/**
 * Page lifecycle: a shared editor page is opened in `beforeAll`. After each
 * test, `afterEach` discards the added paragraphs (`revertAllChanges`) and
 * resets the `anchor` view option to OFF so the next test starts from the
 * same baseline.
 */
describe('The anchors feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    // The empty editorial page "Blank" (content/nodes/blank.yml).
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/blank', 'blank'),
    )
    await captureClipboard(page)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await revertAllChanges(page)

    // Reset the anchor view option to OFF (needs the dropdown open to click).
    await openViewOptions(page)
    if (
      (await anchorViewOption(page).getAttribute('data-test-active')) === 'true'
    ) {
      await anchorViewOption(page).click()
    }
    await closeViewOptions(page)

    // Clear the clipboard recorder so the next clipboard assertion starts empty.
    await captureClipboard(page)
  })

  test('toggling the view option shows and hides the indicator', async () => {
    const uuid = await addAnchored(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await openViewOptions(page)
    const vo = anchorViewOption(page)

    // The option defaults to ON and its state persists, so normalize to OFF
    // first — this test is about the toggle wiring, not the default.
    if ((await vo.getAttribute('data-test-active')) === 'true') {
      await vo.click()
    }
    expect(await vo.getAttribute('data-test-active')).toBe('false')
    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)

    // Turning it on draws the indicator.
    await vo.click()
    expect(await vo.getAttribute('data-test-active')).toBe('true')
    await indicator.waitFor({ state: 'attached' })
    expect(await indicator.count()).toBe(1)

    // Toggling off removes it again.
    await vo.click()
    expect(await vo.getAttribute('data-test-active')).toBe('false')
    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)
  })

  test('the indicator shows the "#<anchor>" label', async () => {
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })

    expect((await indicator.textContent())?.trim()).toBe('#' + ANCHOR)
  })

  test('a block without an anchor has no indicator', async () => {
    // An anchored title (proves the overlay is active) ...
    const anchored = await addAnchored(page, ANCHOR)
    // ... and one without an anchor or a title — it must not get an indicator.
    const plain = await addContentBlock(page, 'title')

    await enableAnchors(page, ANCHOR)
    await anchorIndicator(page, anchored).waitFor({ state: 'attached' })

    expect(await anchorIndicator(page, anchored).count()).toBe(1)
    expect(await anchorIndicator(page, plain).count()).toBe(0)
  })

  test('each anchored block gets its own indicator', async () => {
    const alpha = await addAnchored(page, 'alpha')
    const beta = await addAnchored(page, 'beta')

    await enableAnchors(page, 'beta')
    await page.waitForFunction(() => Boolean(document.getElementById('alpha')))
    await anchorIndicator(page, alpha).waitFor({ state: 'attached' })
    await anchorIndicator(page, beta).waitFor({ state: 'attached' })

    expect((await anchorIndicator(page, alpha).textContent())?.trim()).toBe(
      '#alpha',
    )
    expect((await anchorIndicator(page, beta).textContent())?.trim()).toBe(
      '#beta',
    )
  })

  test('the indicator is removed when its block is deleted', async () => {
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })

    await deleteBlock(page, uuid)

    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)
  })

  test('the indicator reacts to anchor changes while shown', async () => {
    const uuid = await addContentBlock(page, 'title')

    // Enable anchors while the title has no anchor → no indicator yet.
    await enableAnchors(page)
    const indicator = anchorIndicator(page, uuid)
    expect(await indicator.count()).toBe(0)

    // Setting an anchor makes the indicator appear.
    await setAnchor(page, uuid, 'dynamic')
    await indicator.waitFor({ state: 'attached' })
    expect((await indicator.textContent())?.trim()).toBe('#dynamic')

    // Renaming updates the label in place.
    await setAnchor(page, uuid, 'renamed')
    await expect
      .poll(() => indicator.textContent().then((t) => t?.trim()))
      .toBe('#renamed')

    // Clearing the anchor removes the indicator.
    await setAnchor(page, uuid, '')
    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)
  })

  test('the indicator repositions when a preceding block is deleted', async () => {
    // A tall paragraph ABOVE the anchored one (explicit `afterUuid` so the
    // anchored one really follows it — `afterUuid: null` would prepend
    // instead).
    const preceding = await addContentBlock(page, 'call_to_action')
    const anchored = await addAnchored(page, ANCHOR, preceding)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, anchored)
    await indicator.waitFor({ state: 'attached' })

    // The indicator sits exactly at the block's snapped artboard Y.
    const before = await blockSnappedY(page, anchored)
    await expect
      .poll(() => indicatorTranslateY(page, anchored), { timeout: 2000 })
      .toBe(before)

    // Deleting the block above shifts the anchored block up; the indicator
    // follows to the new (smaller) snapped position.
    await deleteBlock(page, preceding)
    await expect
      .poll(() => indicatorTranslateY(page, anchored), { timeout: 5000 })
      .not.toBe(before)

    const after = await blockSnappedY(page, anchored)
    expect(after).toBeLessThan(before!)
    expect(await indicatorTranslateY(page, anchored)).toBe(after)
  })

  test('clicking the indicator copies the adapter link', async () => {
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })
    await indicator.dispatchEvent('click')

    // The Drupal adapter's `buildAnchorLink`: the entity's link path (the
    // node's system path, which outlives its alias) and the anchor.
    await expect.poll(() => copiedText(page)).toHaveLength(1)
    expect((await copiedText(page))[0]).toMatch(
      new RegExp(`^/node/\\d+#${ANCHOR}$`),
    )
  })
})
