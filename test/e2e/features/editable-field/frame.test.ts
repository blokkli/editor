import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, getHostContext } from './../../support/session'
import { addBlock } from './../../support/blocks'
import {
  openEditableField,
  blockHost,
  waitForEditableText,
  editableFrame,
  editableOverlay,
  frameSrc,
  setFrameValue,
  saveByClickAway,
} from './../../support/editable'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import { setupEditorE2E } from './../../support/setup'

type FieldValueCall = { uuid?: string; fieldName: string; fieldValue: string }

/**
 * The frame editor (`type: 'frame'`) — the rich-text variant that mounts a
 * CKEditor in a same-origin iframe and syncs to the editor over `postMessage`.
 * The `text` block's `text` field is the playground's frame field.
 *
 * Editing is driven through the editor's own set-value channel (see
 * `setFrameValue`): typing keystrokes into a CKEditor instance inside an iframe
 * is unreliable under Playwright, so we exercise the parent↔iframe value path
 * deterministically instead.
 */
/**
 * Page lifecycle: one editor page shared. Each test adds its own text block,
 * so the per-test uuid is unique. `afterEach` closes any open editable via
 * `saveByClickAway` — the overlay's `save` early-returns when nothing
 * changed, so closing test 1's pristine editable doesn't record a stray
 * `updateFieldValue` call. The adapter recorder is also cleared so test 2's
 * `waitForAdapterCall('updateFieldValue')` only sees its own write.
 */
describe('Editable field — frame (rich text)', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
    await clearAdapterCalls(page)
  })

  test('opens the rich-text iframe pointed at the field editor', async () => {
    const host = await getHostContext(page)
    const uuid = (await addBlock(page, { bundle: 'text' }))!

    await openEditableField(page, 'text', uuid)

    // The iframe mounts, pointed at the field-value editor for this block/field.
    await editableFrame(page)
    expect(await frameSrc(page)).toBe(
      `/blokkli-form/${host.type}/${host.uuid}/fieldValueEditor?fieldName=text&uuid=${uuid}`,
    )
    // A rich-text (markup) field has no plaintext character counter.
    expect(
      await page.locator('[data-test="editable-char-count"]').count(),
    ).toBe(0)
  })

  test('editing the rich text updates the block and persists on save', async () => {
    const uuid = (await addBlock(page, { bundle: 'text' }))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'text', uuid)
    // Wait for the CKEditor to mount before pushing a value into it.
    await editableFrame(page)
    await setFrameValue(page, '<p>Edited rich text</p>')

    // The live preview writes the new (backend-formatted) value into the block.
    await waitForEditableText(page, 'text', host, 'Edited rich text')

    await saveByClickAway(page)
    const call = await waitForAdapterCall<FieldValueCall>(
      page,
      'updateFieldValue',
    )
    expect(call.uuid).toBe(uuid)
    expect(call.fieldName).toBe('text')
    expect(call.fieldValue).toContain('Edited rich text')
  })
})
