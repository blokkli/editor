import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock, selectBlock, blockCount } from './../../support/blocks'
import { clickItemDropdownAction } from './../../support/itemActions'
import { dialog, dialogSubmit } from './../../support/overlays'
import { emitEvent } from './../../support/events'
import {
  recordedAdapterCalls,
  waitForAdapterCall,
} from './../../support/recorder'

/**
 * The block-transfer feature: export the selected blocks to a portable
 * "transferable" envelope (a dropdown item action) and import them back. The
 * playground page host (`content:page`) has three block fields, so a paste there
 * always *starts a drag* (the user picks the field) rather than auto-importing —
 * the actual import runs through the registered drop handler. We drive that drop
 * handler directly (`app.dragdrop.getDropHandler('block_transfer')`): the drag
 * gesture itself belongs to the dragging-overlay feature, while the import +
 * summary logic is what this feature owns.
 *
 * Selectors are `data-test` only; assertions avoid translated copy and instead
 * check recorder payloads, DOM structure, and the editor's drag state.
 */
const EXPORT_ACTION = 'block-transfer-export'

type ExportArgs = {
  uuids: string[]
  bundles: string[] | null
  transferable: string | null
}

type ImportSummary = {
  paragraphsImported: number
  skippedBundles: { bundle: string; count: number }[]
  droppedFields: { bundle: string; fieldName: string }[]
}

type ImportArgs = {
  host: { type: string; uuid: string; fieldName: string }
  afterUuid: string | null
  importSummary?: ImportSummary
}

/** Run the export dropdown action and return the recorded adapter envelope. */
async function exportSelection(page: Page): Promise<ExportArgs> {
  await clickItemDropdownAction(page, EXPORT_ACTION)
  return waitForAdapterCall<ExportArgs>(page, 'exportBlocksToTransferable')
}

/**
 * Import a transferable by invoking the `block_transfer` drop handler directly
 * with a host built from the current entity's field — the same call the
 * dragging-overlay makes on drop. Resolves once the import (and any summary) has
 * fully run.
 */
function importTransfer(
  page: Page,
  transferable: string,
  fieldName = 'content',
): Promise<void> {
  return page.evaluate(
    async ({ transferable, fieldName }) => {
      const app = window.__BLOKKLI__!.app!
      const ctx = app.context.value
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
    },
    { transferable, fieldName },
  )
}

/** Build a transferable envelope from serialized paragraphs. */
function craftTransferable(
  paragraphs: Array<{
    bundle: string
    values?: Record<string, unknown>
  }>,
): string {
  return JSON.stringify({ version: 1, paragraphs })
}

/** All recorded import calls so far. */
async function importCalls(page: Page): Promise<ImportArgs[]> {
  const calls = await recordedAdapterCalls<ImportArgs>(page)
  return calls
    .filter((c) => c.method === 'importBlocksFromTransferable')
    .map((c) => c.args)
}

describe('The block transfer feature', async () => {
  await setupEditorE2E()

  test('exports the selected block to a transferable envelope', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
    const uuid = await addBlock(page, { bundle: 'card' })
    await selectBlock(page, uuid!)

    const args = await exportSelection(page)

    // The adapter is asked to export exactly the selection, and the envelope
    // reflects the selected block's bundle.
    expect(args.uuids).toEqual([uuid])
    expect(args.bundles).toEqual(['card'])
    expect(typeof args.transferable).toBe('string')
    expect(args.transferable!.length).toBeGreaterThan(0)

    await page.close()
  })

  test('round-trips: exported blocks import back into the page', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
    const uuid = await addBlock(page, { bundle: 'card' })
    await selectBlock(page, uuid!)

    const { transferable } = await exportSelection(page)
    const before = await blockCount(page)

    await importTransfer(page, transferable!)

    // One block was added back into the same field; the clean import reports it
    // without surfacing the summary dialog.
    const args = await waitForAdapterCall<ImportArgs>(
      page,
      'importBlocksFromTransferable',
    )
    expect(args.host.fieldName).toBe('content')
    expect(args.importSummary?.paragraphsImported).toBe(1)
    await expect.poll(() => blockCount(page)).toBe(before + 1)
    expect(await dialog(page, 'block-transfer-summary').count()).toBe(0)

    await page.close()
  })

  test('shows an import summary when bundles are skipped or fields dropped', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')

    // One block of an unknown bundle (skipped entirely) and one valid `text`
    // block carrying a field that doesn't exist on it (dropped, but the block
    // still imports).
    const transferable = craftTransferable([
      { bundle: 'does_not_exist', values: {} },
      { bundle: 'text', values: { text: ['<p>hi</p>'], notAField: ['x'] } },
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

    // The recorded summary captures the same outcome (locale-independent).
    const args = await waitForAdapterCall<ImportArgs>(
      page,
      'importBlocksFromTransferable',
    )
    const summary = args.importSummary!
    expect(summary.paragraphsImported).toBe(1)
    expect(summary.skippedBundles).toEqual([
      { bundle: 'does_not_exist', count: 1 },
    ])
    expect(summary.droppedFields).toEqual([
      { bundle: 'text', fieldName: 'notAField' },
    ])

    // Submitting closes the dialog.
    await dialogSubmit(page).click()
    await dialog(page, 'block-transfer-summary').waitFor({ state: 'detached' })

    await page.close()
  })

  test('a multi-field host paste starts a drag instead of importing', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
    const before = await blockCount(page)

    // The page host has three block fields, so pasting can't pick a target on
    // its own — it begins a drag for the user to drop into a field.
    emitEvent(page, 'clipboard:paste', {
      meta: {
        hostUuid: '1',
        hostEntityType: 'content',
        hostBundle: 'page',
      },
      data: {
        type: 'block_transfer',
        bundles: ['card'],
        transferable: craftTransferable([{ bundle: 'card', values: {} }]),
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

    // Nothing was imported: no adapter call, no new blocks.
    expect(await importCalls(page)).toHaveLength(0)
    expect(await blockCount(page)).toBe(before)

    // End the drag so it doesn't leak into teardown.
    await emitEvent(page, 'dragging:end')
    await page.close()
  })

  test('ignores a paste that is not a block transfer', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
    const before = await blockCount(page)

    // A non-transfer clipboard payload: the listener bails immediately.
    await emitEvent(page, 'clipboard:paste', {
      meta: {
        hostUuid: '1',
        hostEntityType: 'content',
        hostBundle: 'page',
      },
      data: { type: 'selection', uuids: ['some-uuid'] },
    })

    expect(await withApp(page, (app) => app.selection.isDragging.value)).toBe(
      false,
    )
    expect(await importCalls(page)).toHaveLength(0)
    expect(await blockCount(page)).toBe(before)

    await page.close()
  })
})
