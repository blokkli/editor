import { describe, expect, test } from 'vitest'
import { openEditor, withApp, getHostContext } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { blockCount, blockState, selectBlock } from './../../support/blocks'
import { topLevelBlockUuids } from './../../support/selection'
import {
  copySelection,
  captureClipboard,
  copiedText,
  pasteText,
  dispatchPaste,
  dropDragInto,
} from './../../support/clipboard'

/**
 * Copy/paste of existing blocks. `Cmd/Ctrl+C` serialises the selection into a
 * marker "envelope" (`ui.setClipboardData` → `navigator.clipboard.writeText`).
 * Pasting that envelope is detected by `onPaste` (JSON starting with `{`),
 * unwrapped (`parseClipboardEnvelope`) and dispatched as `clipboard:paste`; the
 * `selection` listener starts an `existing` *copy* drag, whose drop calls
 * `adapter.pasteExistingBlocks` (a duplicate in the mock).
 *
 * The envelope carries the source host's uuid, and the listener ignores a
 * payload whose `hostUuid` differs from the current host — the copied block
 * uuids don't exist elsewhere.
 *
 * Copy writes to `navigator.clipboard`, which is unavailable/flaky in headless,
 * so we stub `writeText` to capture it ({@link captureClipboard}). Assertions are
 * locale-independent (the envelope's machine fields, block bundles).
 */

describe('Copying and pasting a selection', async () => {
  await setupEditorE2E()

  test('copying writes a selection envelope with the selected uuids', async () => {
    const page = await openEditor()
    await captureClipboard(page)
    const host = await getHostContext(page)
    const first = (await topLevelBlockUuids(page))[0]!

    await selectBlock(page, first)
    await copySelection(page)

    await expect.poll(() => copiedText(page)).toHaveLength(1)
    const envelope = JSON.parse((await copiedText(page))[0]!)
    expect(envelope.blokkli_clipboard_data).toBe(true)
    expect(envelope.meta.hostUuid).toBe(host.uuid)
    expect(envelope.data).toEqual({ type: 'selection', uuids: [first] })

    await page.close()
  })

  test('pasting a copied selection duplicates the block', async () => {
    const page = await openEditor()
    await captureClipboard(page)
    const first = (await topLevelBlockUuids(page))[0]!
    const sourceBundle = (await blockState(page, first)).bundle

    await selectBlock(page, first)
    await copySelection(page)
    await expect.poll(() => copiedText(page)).toHaveLength(1)
    const envelope = (await copiedText(page))[0]!

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    // Pasting the very string copy produced — a real round-trip.
    await pasteText(page, envelope)
    await dropDragInto(page)

    await expect.poll(() => blockCount(page)).toBe(uuidsBefore.length + 1)
    const added = (await withApp(page, (app) => app.state.getAllUuids())).find(
      (uuid) => !uuidsBefore.includes(uuid),
    )!
    // The paste is a copy: a new block of the same bundle as the source.
    expect(added).not.toBe(first)
    expect((await blockState(page, added)).bundle).toBe(sourceBundle)

    await page.close()
  })

  test('a selection copied from a different host is ignored', async () => {
    const page = await openEditor()
    const first = (await topLevelBlockUuids(page))[0]!
    const before = await blockCount(page)

    // Same payload shape, but stamped with a foreign host uuid.
    const foreign = JSON.stringify({
      blokkli_clipboard_data: true,
      meta: {
        hostUuid: 'some-other-host',
        hostEntityType: 'content',
        hostBundle: 'page',
      },
      data: { type: 'selection', uuids: [first] },
    })
    await dispatchPaste(page, foreign)

    // Give the (rejected) paste a chance to act, then assert it did nothing.
    await page.waitForTimeout(400)
    expect(await withApp(page, (app) => app.selection.isDragging.value)).toBe(
      false,
    )
    expect(await blockCount(page)).toBe(before)

    await page.close()
  })
})
