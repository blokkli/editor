import { describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { setupEditorE2E } from '../../support/setup'
import { captureClipboard, copiedText } from '../../support/clipboard'

/**
 * The anchors feature is a toolbar view option (`anchor`). When enabled it scans
 * the rendered page for elements with an `id`, finds the owning block and draws a
 * left-edge indicator showing `#<id>`. Clicking the indicator copies a link —
 * `adapter.buildAnchorLink(id, uuid)` if defined, else `route.path + '#' + id`.
 * The overlay recomputes its items on mount and on every `state:reloaded`, so it
 * tracks block add/delete/option changes. Each frame, the indicator is
 * positioned at its block's artboard Y, snapped to a 30px grid
 * (`snapToAnchorGrid`), inside a container carrying the artboard transform.
 *
 * The playground's `two_columns` block renders its root `<div :id="anchorId">`
 * (option `anchorId`, type `text`), which is the clean way to produce an anchor.
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

function viewOption(page: Page): Locator {
  return page.locator('[data-test-view-option="anchor"]')
}

function anchorIndicator(page: Page, uuid: string): Locator {
  return page.locator(
    `[data-test-block-indicator="anchor"][data-test-uuid="${uuid}"]`,
  )
}

/** Add a block to the host `content` field. `afterUuid` controls ordering (a
 * null/omitted value prepends). Returns the new block uuid. */
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
            fieldName: 'content',
          },
          afterUuid: afterUuid ?? null,
        }),
      )
      return app.state.getAllUuids().find((u) => !before.has(u)) ?? null
    },
    { bundle, afterUuid },
  )
  if (!uuid) {
    throw new Error(`Failed to add a "${bundle}" block`)
  }
  return uuid
}

/** Set a block's `anchorId` option (the value becomes the block root's `id`). */
function setAnchorId(page: Page, uuid: string, value: string): Promise<void> {
  return page.evaluate(
    async ({ uuid, value }) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.updateOptions!([{ uuid, key: 'anchorId', value }]),
      )
    },
    { uuid, value },
  )
}

/** Add a `two_columns` block with the given `anchorId`. */
async function addAnchored(
  page: Page,
  anchorId: string,
  afterUuid?: string,
): Promise<string> {
  const uuid = await addContentBlock(page, 'two_columns', afterUuid)
  await setAnchorId(page, uuid, anchorId)
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
 * anchored element to be in the DOM first so the overlay's mount scan sees it. */
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
  await viewOption(page).click()
}

/** The indicator's current `translateY` (px), or null if not positioned yet. */
function indicatorTranslateY(page: Page, uuid: string): Promise<number | null> {
  return page.evaluate((uuid) => {
    const el = document.querySelector(
      `[data-test-block-indicator="anchor"][data-test-uuid="${uuid}"]`,
    )
    const match = (el as HTMLElement | null)?.style.transform.match(
      /translateY\(([-\d.]+)px\)/,
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

describe('The anchors feature', async () => {
  await setupEditorE2E()

  test('toggling the view option shows and hides the indicator', async () => {
    const page = await openEditor()
    const uuid = await addAnchored(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    const vo = viewOption(page)

    // Off by default: no indicator.
    expect(await vo.getAttribute('data-test-active')).toBe('false')
    expect(await indicator.count()).toBe(0)

    await enableAnchors(page, ANCHOR)
    expect(await vo.getAttribute('data-test-active')).toBe('true')
    await indicator.waitFor({ state: 'attached' })
    expect(await indicator.count()).toBe(1)

    // Toggling off removes it again.
    await vo.click()
    expect(await vo.getAttribute('data-test-active')).toBe('false')
    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)

    await page.close()
  })

  test('the indicator shows the "#<anchorId>" label', async () => {
    const page = await openEditor()
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })

    expect((await indicator.textContent())?.trim()).toBe('#' + ANCHOR)

    await page.close()
  })

  test('a block with an empty anchor id has no indicator', async () => {
    const page = await openEditor()
    // An anchored block (proves the overlay is active) ...
    const anchored = await addAnchored(page, ANCHOR)
    // ... and one whose `anchorId` is left empty — it must not get an indicator.
    const plain = await addContentBlock(page, 'two_columns')

    await enableAnchors(page, ANCHOR)
    await anchorIndicator(page, anchored).waitFor({ state: 'attached' })

    expect(await anchorIndicator(page, anchored).count()).toBe(1)
    expect(await anchorIndicator(page, plain).count()).toBe(0)

    await page.close()
  })

  test('each anchored block gets its own indicator', async () => {
    const page = await openEditor()
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

    await page.close()
  })

  test('the indicator is removed when its block is deleted', async () => {
    const page = await openEditor()
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })

    await deleteBlock(page, uuid)

    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)

    await page.close()
  })

  test('the indicator reacts to anchor id changes while shown', async () => {
    const page = await openEditor()
    const uuid = await addContentBlock(page, 'two_columns')

    // Enable anchors while the block has no anchor id → no indicator yet.
    await enableAnchors(page)
    const indicator = anchorIndicator(page, uuid)
    expect(await indicator.count()).toBe(0)

    // Setting an anchor id makes the indicator appear.
    await setAnchorId(page, uuid, 'dynamic')
    await indicator.waitFor({ state: 'attached' })
    expect((await indicator.textContent())?.trim()).toBe('#dynamic')

    // Renaming updates the label in place.
    await setAnchorId(page, uuid, 'renamed')
    await expect
      .poll(() => indicator.textContent().then((t) => t?.trim()))
      .toBe('#renamed')

    // Clearing the anchor id removes the indicator.
    await setAnchorId(page, uuid, '')
    await indicator.waitFor({ state: 'detached' })
    expect(await indicator.count()).toBe(0)

    await page.close()
  })

  test('the indicator repositions when a preceding block is deleted', async () => {
    const page = await openEditor()
    // A tall block ABOVE the anchored one (explicit `afterUuid` so the anchored
    // block really follows it — `afterUuid: null` would prepend instead).
    const preceding = await addContentBlock(page, 'card')
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

    await page.close()
  })

  test('clicking the indicator copies the fallback anchor link', async () => {
    const page = await openEditor()
    await captureClipboard(page)
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })
    await indicator.dispatchEvent('click')

    // No `buildAnchorLink` adapter method → fallback `route.path + '#' + id`.
    const pathname = await page.evaluate(() => location.pathname)
    await expect.poll(() => copiedText(page)).toContain(`${pathname}#${ANCHOR}`)

    await page.close()
  })

  test('clicking the indicator copies the adapter link when buildAnchorLink is defined', async () => {
    // `?anchorLink=adapter` makes the mock adapter provide `buildAnchorLink`.
    const page = await openEditor(
      '/page/1?blokkliEditing=1&testing=true&anchorLink=adapter',
    )
    await captureClipboard(page)
    const uuid = await addAnchored(page, ANCHOR)

    await enableAnchors(page, ANCHOR)
    const indicator = anchorIndicator(page, uuid)
    await indicator.waitFor({ state: 'attached' })
    await indicator.dispatchEvent('click')

    await expect
      .poll(() => copiedText(page))
      .toContain(`https://blokk.li/p/${uuid}#${ANCHOR}`)

    await page.close()
  })
})
