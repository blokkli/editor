import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Frame, Page } from 'playwright-core'
import { openSidebar } from '../../support/sidebar'
import { addBlock, selectBlock } from '../../support/blocks'
import { getPreviewFrame } from '../../support/preview'
import { toggleCheckboxOption } from '../../support/options'
import { clickItemAction } from '../../support/itemActions'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

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
 *
 * On the page "Long" (content/nodes/long.yml): its last text is far below the
 * fold in the preview's narrow viewport.
 */

const LONG_EDITOR_PATH = editorPath('/en/long', 'long')
const TITLE = seedUuid('paragraph', 'long-title')
const LAST_TEXT = seedUuid('paragraph', 'long-last-text')

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

/** Whether the table `uuid` has striped rows inside the preview: the Table
 *  component's `is-striped` class (the site's own), from its `striped`
 *  option. */
function tableIsStriped(frame: Frame, uuid: string): Promise<boolean> {
  return frame.evaluate((uuid) => {
    const root = document.querySelector(`[data-bk-uuid="${uuid}"]`)
    return !!root?.matches('.is-striped, :has(.is-striped)')
  }, uuid)
}

/**
 * Page lifecycle: one editor page shared. The preview iframe is mounted by
 * opening the `mobile-preview` sidebar in `beforeAll`, and the resulting
 * `Frame` handle is cached for every test. The tests add paragraphs at the top
 * of the field, which only moves the last text further down, and delete the
 * title, which no other test uses. `afterEach` only deselects — the sidebar
 * stays open so the iframe handle keeps working.
 */
describe('The responsive preview', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let frame: Frame

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', LONG_EDITOR_PATH)
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
    // The last text sits far below the fold in the narrow viewport. Under
    // load, the preview can take more than a second to render it.
    await frame
      .locator(`[data-bk-uuid="${LAST_TEXT}"]`)
      .waitFor({ state: 'attached' })
    expect(await blockInView(frame, LAST_TEXT)).toBe(false)

    // Select it in the editor; the preview should follow. Re-emit inside the
    // poll: a single focus can no-op if it lands during a transient iframe
    // layout (the block momentarily measured as on-screen), with no re-trigger.
    await expect
      .poll(
        async () => {
          await selectBlock(page, LAST_TEXT)
          return blockInView(frame, LAST_TEXT)
        },
        { timeout: 15000, interval: 500 },
      )
      .toBe(true)
  })

  test('syncs a block option change to the iframe', async () => {
    // Add a table (its `striped` option defaults off) and confirm it renders
    // without stripes in the preview.
    const uuid = await addBlock(page, {
      bundle: 'table',
      fieldName: 'field_paragraphs',
    })
    expect(uuid).toBeTruthy()
    await expect.poll(() => blockExists(frame, uuid!)).toBe(true)
    expect(await tableIsStriped(frame, uuid!)).toBe(false)

    // Select it so the block-actions toolbar shows its options.
    await selectBlock(page, uuid!)

    // Toggle the "Striped rows" option; the change must propagate to the
    // preview. The editor sends it there right away; Drupal only stores it
    // when the table is deselected.
    await toggleCheckboxOption(page, 'striped')
    await expect.poll(() => tableIsStriped(frame, uuid!)).toBe(true)
  })

  test('renders a nested block added inside columns in the iframe', async () => {
    // Add columns to the page; they should render in the preview.
    const columnsUuid = await addBlock(page, {
      bundle: 'columns',
      fieldName: 'field_paragraphs',
    })
    expect(columnsUuid).toBeTruthy()
    await expect.poll(() => blockExists(frame, columnsUuid!)).toBe(true)

    // Add a title into their `field_left`; the nested block must also render
    // in the preview.
    const titleUuid = await addBlock(page, {
      bundle: 'title',
      fieldName: 'field_left',
      hostUuid: columnsUuid!,
    })
    expect(titleUuid).toBeTruthy()
    await expect.poll(() => blockExists(frame, titleUuid!)).toBe(true)
  })

  test('removes a deleted block from the iframe', async () => {
    await expect.poll(() => blockExists(frame, TITLE)).toBe(true)

    // Select it so the block-actions toolbar (with the delete action) renders,
    // then delete it.
    await selectBlock(page, TITLE)
    const deleted = nextMutation(page, 'pbDeleteMultipleParagraphs')
    await clickItemAction(page, 'delete')
    await deleted

    // The deletion must propagate to the preview.
    await expect.poll(() => blockExists(frame, TITLE)).toBe(false)
  })
})
