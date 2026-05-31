import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Frame, Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { openSidebar } from './../../support/sidebar'
import { addBlock, selectBlock } from './../../support/blocks'
import { getPreviewFrame } from './../../support/preview'
import { toggleCheckboxOption } from './../../support/options'
import { clickItemAction } from './../../support/itemActions'
import { setupEditorE2E } from './../../support/setup'
import { emitEvent } from './../../support/events'

/**
 * The responsive preview renders the page in an iframe (`?blokkliPreview`) and
 * keeps it in sync via `PreviewProvider`. These exercise two slices of that
 * sync, end to end (editor → postMessage → iframe):
 *  - selecting a block scrolls it into view in the iframe;
 *  - changing a block option re-renders the block in the iframe.
 *
 * Inside the iframe there is no `window.__BLOKKLI__` (preview mode); blocks are
 * identified by `[data-bk-uuid]` (the runtime's own block id, the same selector
 * the feature uses), so the in-frame checks query it via app-style DOM JS.
 */

/** The last rendered block's uuid in the preview; waits until blocks render. */
async function lastBlockUuid(frame: Frame): Promise<string> {
  const handle = await frame.waitForFunction(() => {
    const blocks = document.querySelectorAll('[data-bk-uuid]')
    return blocks.length
      ? blocks[blocks.length - 1]!.getAttribute('data-bk-uuid')
      : null
  })
  return handle.jsonValue() as Promise<string>
}

/** Whether the block with `uuid` intersects the preview iframe's viewport. */
function blockInView(frame: Frame, uuid: string): Promise<boolean> {
  return frame.evaluate((uuid) => {
    const el = document.querySelector(`[data-bk-uuid="${uuid}"]`)
    if (!el) {
      return false
    }
    const r = el.getBoundingClientRect()
    return (
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < window.innerHeight &&
      r.left < window.innerWidth
    )
  }, uuid)
}

/** Whether a block with `uuid` is rendered in the preview iframe. */
function blockExists(frame: Frame, uuid: string): Promise<boolean> {
  return frame.evaluate(
    (uuid) => !!document.querySelector(`[data-bk-uuid="${uuid}"]`),
    uuid,
  )
}

/** The `data-test` of the card block `uuid` inside the preview (e.g. the Card
 *  component's `card-is-box` / `card-is-plain`, toggled by its `box` option). */
function cardDataTest(frame: Frame, uuid: string): Promise<string | null> {
  return frame.evaluate((uuid) => {
    const root = document.querySelector(`[data-bk-uuid="${uuid}"]`)
    if (!root) {
      return null
    }
    const el = root.matches('[data-test^="card-is-"]')
      ? root
      : root.querySelector('[data-test^="card-is-"]')
    return el?.getAttribute('data-test') ?? null
  }, uuid)
}

/**
 * Page lifecycle: one editor page shared. The preview iframe is mounted by
 * opening the `mobile-preview` sidebar in `beforeAll`, and the resulting
 * `Frame` handle is cached for every test. Test 1 (scroll-into-view) MUST run
 * first — it relies on the seeded last block sitting far below the fold;
 * once tests 2/3 add blocks at the top of the field that assumption breaks
 * because the new last block is the just-added one in the visible area.
 * `afterEach` only deselects — the sidebar stays open so the iframe handle
 * keeps working.
 */
describe('The responsive preview', async () => {
  await setupEditorE2E()

  let page: Page
  let frame: Frame

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'mobile-preview')
    frame = await getPreviewFrame(page)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
  })

  test('scrolls the selected block into view inside the iframe', async () => {
    // The last rendered block sits far below the fold in the narrow viewport.
    const uuid = await lastBlockUuid(frame)
    expect(await blockInView(frame, uuid)).toBe(false)

    // Select it in the editor; the preview should follow. Re-emit inside the
    // poll: a single focus can no-op if it lands during a transient iframe
    // layout (the block momentarily measured as on-screen), with no re-trigger.
    await expect
      .poll(
        async () => {
          await selectBlock(page, uuid)
          return blockInView(frame, uuid)
        },
        { timeout: 15000, interval: 500 },
      )
      .toBe(true)
  })

  test('syncs a block option change to the iframe', async () => {
    // Add a card (its `box` option defaults on) and confirm it renders boxed in
    // the preview.
    const uuid = await addBlock(page, { bundle: 'card' })
    expect(uuid).toBeTruthy()
    await expect.poll(() => cardDataTest(frame, uuid!)).toBe('card-is-box')

    // Select it so the block-actions toolbar shows its options.
    await selectBlock(page, uuid!)

    // Toggle the "Box" option; the change must propagate to the preview.
    await toggleCheckboxOption(page, 'box')
    await expect.poll(() => cardDataTest(frame, uuid!)).toBe('card-is-plain')
  })

  test('renders a nested block added inside a grid in the iframe', async () => {
    // Add a grid to the page; it should render in the preview.
    const gridUuid = await addBlock(page, { bundle: 'grid' })
    expect(gridUuid).toBeTruthy()
    await expect.poll(() => blockExists(frame, gridUuid!)).toBe(true)

    // Add a title into the grid's `header` field (allows `title`/`text`); the
    // nested block must also render in the preview.
    const titleUuid = await addBlock(page, {
      bundle: 'title',
      fieldName: 'header',
      hostUuid: gridUuid!,
    })
    expect(titleUuid).toBeTruthy()
    await expect.poll(() => blockExists(frame, titleUuid!)).toBe(true)
  })

  test('removes a deleted block from the iframe', async () => {
    // The last rendered block in the preview also exists in the editor.
    const uuid = await lastBlockUuid(frame)
    expect(await blockExists(frame, uuid)).toBe(true)

    // Select it so the block-actions toolbar (with the delete action) renders,
    // then delete it.
    await selectBlock(page, uuid)
    await clickItemAction(page, 'delete')

    // The deletion must propagate to the preview.
    await expect.poll(() => blockExists(frame, uuid)).toBe(false)
  })
})
