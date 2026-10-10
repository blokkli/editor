import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { selectBlock, blockCount } from '../../support/blocks'
import { clickItemDropdownAction } from '../../support/itemActions'
import { dialog, dialogSubmit, dismissMessages } from '../../support/overlays'
import { emitEvent } from '../../support/events'
import { captureClipboard, copiedText } from '../../support/clipboard'
import { countMutations, nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/**
 * The block-transfer feature: export the selected blocks to a portable
 * "transferable" envelope (a dropdown item action) and import them back. A
 * page (content/nodes/blocks.yml) has several paragraph fields, so a paste
 * there always *starts a drag* (the user picks the field) rather than
 * auto-importing — the actual import runs through the registered drop handler.
 * We drive that drop handler directly
 * (`app.dragdrop.getDropHandler('block_transfer')`): the drag gesture itself
 * belongs to the dragging-overlay feature, while the import + summary logic is
 * what this feature owns.
 *
 * Drupal makes the envelope (`pbExportParagraphs`) and imports it
 * (`pbImport`); the export lands on the clipboard, which
 * {@link captureClipboard} records. Selectors are `data-test` only; assertions
 * avoid translated copy and instead check the envelope, the requests, DOM
 * structure, and the editor's drag state.
 */
const EXPORT_ACTION = 'block-transfer-export'

const NODE = seedUuid('node', 'blocks')
const TEXT = seedUuid('paragraph', 'first-text')

type Transfer = {
  type: 'block_transfer'
  bundles: string[]
  transferable: string
}

/** Run the export dropdown action and return what it put on the clipboard. */
async function exportSelection(page: Page): Promise<Transfer> {
  const copied = (await copiedText(page)).length
  await clickItemDropdownAction(page, EXPORT_ACTION)
  await expect
    .poll(async () => (await copiedText(page)).length)
    .toBe(copied + 1)
  return JSON.parse((await copiedText(page)).at(-1)!).data
}

/**
 * Import a transferable by invoking the `block_transfer` drop handler directly
 * with a host built from the current entity's field — the same call the
 * dragging-overlay makes on drop. Resolves once the import (and any summary) has
 * fully run.
 */
function importTransfer(page: Page, transferable: string): Promise<void> {
  return page.evaluate(async (transferable) => {
    const app = window.__BLOKKLI__!.app!
    const ctx = app.context.value
    const fieldName = 'field_paragraphs'
    const handler = app.dragdrop.getDropHandler('block_transfer')
    if (!handler) {
      throw new Error('No block_transfer drop handler registered')
    }
    await handler.execute({
      items: [
        {
          itemType: 'block_transfer',
          transferable,
          itemBundles: [],
          element: () => document.body,
        },
      ],
      host: { type: ctx.entityType, uuid: ctx.entityUuid, fieldName },
      afterUuid: null,
      // The `block_transfer` handler only reads `items`/`host`/`afterUuid`;
      // `field`/`bundle` are part of the generic drop contract but unused here.
      field: app.fields.find(ctx.entityUuid, fieldName)!,
      bundle: '',
    })
  }, transferable)
}

/** Build a transferable envelope in Drupal's format. */
function craftTransferable(paragraphs: Array<Record<string, unknown>>): string {
  return JSON.stringify({ version: 1, paragraphs })
}

/**
 * Page lifecycle: one editor page shared by every test, with the clipboard
 * captured. Each test that mutates takes a local `blockCount` snapshot, so
 * accumulated blocks between tests don't matter. `afterEach` ends any leftover
 * drag (test 4 starts one), closes the summary dialog if it's still open and
 * dismisses success toasts (they auto-dismiss after ~6s but can intercept
 * clicks in the meantime).
 */
describe('The block transfer feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let imports: () => number

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    await captureClipboard(page)
    imports = countMutations(page, 'pbImport')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    if (await dialog(page, 'block-transfer-summary').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'block-transfer-summary').waitFor({ state: 'hidden' })
    }
    await dismissMessages(page)
  })

  test('exports the selected block to a transferable envelope', async () => {
    await selectBlock(page, TEXT)

    const transfer = await exportSelection(page)

    // The envelope holds exactly the selection, with its values.
    expect(transfer.type).toBe('block_transfer')
    expect(transfer.bundles).toEqual(['text'])
    const envelope = JSON.parse(transfer.transferable)
    expect(envelope.version).toBe(1)
    expect(envelope.paragraphs).toHaveLength(1)
    expect(envelope.paragraphs[0].bundle).toBe('text')
    expect(JSON.stringify(envelope.paragraphs[0].translations)).toContain(
      'First text.',
    )
  })

  test('round-trips: exported blocks import back into the page', async () => {
    await selectBlock(page, TEXT)

    const { transferable } = await exportSelection(page)
    const before = await blockCount(page)

    const imported = nextMutation(page, 'pbImport')
    await importTransfer(page, transferable)

    // One block was added back into the same field; the clean import reports it
    // without surfacing the summary dialog.
    expect(await imported).toMatchObject({
      hostUuid: NODE,
      hostFieldName: 'field_paragraphs',
    })
    await expect.poll(() => blockCount(page)).toBe(before + 1)
    expect(await dialog(page, 'block-transfer-summary').count()).toBe(0)
  })

  test('shows an import summary when bundles are skipped or fields dropped', async () => {
    const before = await blockCount(page)

    // One paragraph of an unknown bundle (skipped entirely) and one valid
    // `text` paragraph carrying a field that doesn't exist on it (dropped, but
    // the paragraph still imports).
    const transferable = craftTransferable([
      { bundle: 'does_not_exist' },
      {
        bundle: 'text',
        default_langcode: 'en',
        translations: {
          en: {
            field_text: [{ value: '<p>hi</p>', format: 'basic_html' }],
            not_a_field: [{ value: 'x' }],
          },
        },
      },
    ])

    await importTransfer(page, transferable)

    // The summary dialog appears with exactly one skipped + one dropped row.
    await dialog(page, 'block-transfer-summary').waitFor({ state: 'visible' })
    expect(
      await page.locator('[data-test="transfer-summary-skipped-row"]').count(),
    ).toBe(1)
    expect(
      await page.locator('[data-test="transfer-summary-dropped-row"]').count(),
    ).toBe(1)
    await expect.poll(() => blockCount(page)).toBe(before + 1)

    // Submitting closes the dialog.
    await dialogSubmit(page).click()
    await dialog(page, 'block-transfer-summary').waitFor({ state: 'detached' })
  })

  test('a multi-field host paste starts a drag instead of importing', async () => {
    const before = await blockCount(page)
    const imported = imports()

    // A page has several paragraph fields, so pasting can't pick a target on
    // its own — it begins a drag for the user to drop into a field.
    emitEvent(page, 'clipboard:paste', {
      meta: {
        hostUuid: NODE,
        hostEntityType: 'node',
        hostBundle: 'page',
      },
      data: {
        type: 'block_transfer',
        bundles: ['text'],
        transferable: craftTransferable([{ bundle: 'text' }]),
      },
    })

    await expect
      .poll(() => withApp(page, (app) => app.selection.isDragging.value))
      .toBe(true)
    expect(
      await withApp(
        page,
        (app) => app.selection.dragItems.value[0]?.itemType ?? null,
      ),
    ).toBe('block_transfer')

    // Nothing was imported: no request, no new blocks.
    expect(imports()).toBe(imported)
    expect(await blockCount(page)).toBe(before)

    // `afterEach` will end the drag.
  })

  test('ignores a paste that is not a block transfer', async () => {
    const before = await blockCount(page)
    const imported = imports()

    // A non-transfer clipboard payload: the listener bails immediately.
    await emitEvent(page, 'clipboard:paste', {
      meta: {
        hostUuid: NODE,
        hostEntityType: 'node',
        hostBundle: 'page',
      },
      data: { type: 'selection', uuids: ['some-uuid'] },
    })

    expect(await withApp(page, (app) => app.selection.isDragging.value)).toBe(
      false,
    )
    expect(imports()).toBe(imported)
    expect(await blockCount(page)).toBe(before)
  })
})
