import type { Locator, Page } from 'playwright-core'
import { fieldUuids, selectBlocks } from './blocks'
import { clickItemAction } from './itemActions'
import { nextMutation } from './mutations'
import { formOverlay } from './overlays'

/** What a paragraph that shows a library item shows. */
export type ShownLibraryItem = {
  /** The library item's UUID. */
  uuid: string
  label: string
  /** The library item's paragraph. */
  paragraph: { uuid: string; bundle: string; props: Record<string, any> }
}

/**
 * The library item that a paragraph shows, as the editor got it from Drupal.
 * `null` when it shows none: Drupal leaves out an item that the user may not
 * view.
 */
export function shownLibraryItem(
  page: Page,
  uuid: string,
): Promise<ShownLibraryItem | null> {
  return page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    const libraryItem = app.state.getFieldListItem(uuid)?.props?.libraryItem
    const block = libraryItem?.block
    if (!libraryItem?.uuid || !block || !('uuid' in block)) {
      return null
    }
    return {
      uuid: libraryItem.uuid,
      label: libraryItem.label ?? '',
      paragraph: {
        uuid: block.uuid,
        bundle: block.bundle,
        props: block.props ?? {},
      },
    }
  }, uuid)
}

/**
 * Detach paragraphs from the library with the action "Detach from library",
 * and wait until the editor shows their copies. Resolves with the copies'
 * UUIDs, in the order of the paragraphs, which must be in the host entity's
 * `field_paragraphs`.
 */
export async function detachFromLibrary(
  page: Page,
  uuids: string[],
): Promise<string[]> {
  const before = await fieldUuids(page)
  const indexes = uuids.map((uuid) => before.indexOf(uuid))
  await selectBlocks(page, uuids)
  const detached = nextMutation(page, 'pbDetachReusableParagraph')
  await clickItemAction(page, 'library_detach')
  await detached
  await page.waitForFunction((uuids) => {
    const app = window.__BLOKKLI__!.app!
    return uuids.every((uuid) => !app.blocks.getBlock(uuid))
  }, uuids)
  const after = await fieldUuids(page)
  return indexes.map((index) => after[index]!)
}

/** The dialog "Add block from library" (the add action "From library"). */
export function libraryDialog(page: Page): Locator {
  return formOverlay(page, 'library')
}

/** The library items that the dialog "Add block from library" lists. */
export function libraryDialogItem(page: Page, uuid?: string): Locator {
  return libraryDialog(page).locator(
    uuid
      ? `[data-test="library-item"][data-test-library-item-uuid="${uuid}"]`
      : '[data-test="library-item"]',
  )
}

/** The UUIDs of the library items that the dialog lists, once it has loaded. */
export async function libraryDialogItems(page: Page): Promise<string[]> {
  await libraryDialogItem(page).first().waitFor({ state: 'visible' })
  return libraryDialogItem(page).evaluateAll((elements) =>
    elements.map(
      (element) => element.getAttribute('data-test-library-item-uuid') ?? '',
    ),
  )
}
