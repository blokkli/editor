import { describe, expect, test } from 'vitest'
import type { Frame } from 'playwright-core'
import { openEditor } from './../support/session'
import { openSidebar } from './../support/sidebar'
import { addBlock, selectBlock } from './../support/blocks'
import { getPreviewFrame } from './../support/preview'
import { toggleCheckboxOption } from './../support/options'
import { clickItemAction } from './../support/itemActions'
import { setupEditorE2E } from './../support/setup'

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

describe('The responsive preview', async () => {
  await setupEditorE2E()

  test('scrolls the selected block into view inside the iframe', async () => {
    const page = await openEditor()

    // Opening the sidebar mounts the iframe; `getPreviewFrame` waits for it to
    // hydrate so relayed events aren't dropped.
    await openSidebar(page, 'mobile-preview')
    const frame = await getPreviewFrame(page)

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

    await page.close()
  })

  test('syncs a block option change to the iframe', async () => {
    const page = await openEditor()
    await openSidebar(page, 'mobile-preview')
    const frame = await getPreviewFrame(page)

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

    await page.close()
  })

  test('renders a nested block added inside a grid in the iframe', async () => {
    const page = await openEditor()
    await openSidebar(page, 'mobile-preview')
    const frame = await getPreviewFrame(page)

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

    await page.close()
  })

  test('removes a deleted block from the iframe', async () => {
    const page = await openEditor()
    await openSidebar(page, 'mobile-preview')
    const frame = await getPreviewFrame(page)

    // The last rendered block in the preview also exists in the editor.
    const uuid = await lastBlockUuid(frame)
    expect(await blockExists(frame, uuid)).toBe(true)

    // Select it so the block-actions toolbar (with the delete action) renders,
    // then delete it.
    await selectBlock(page, uuid)
    await clickItemAction(page, 'delete')

    // The deletion must propagate to the preview.
    await expect.poll(() => blockExists(frame, uuid)).toBe(false)

    await page.close()
  })
})
