import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../../e2e/support/blocks'
import {
  openEditableField,
  blockHost,
  waitForEditableText,
  editableFrame,
  editableOverlay,
  frameSrc,
  setFrameValue,
  saveByClickAway,
} from '../../../e2e/support/editable'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/** A text, added to the page's paragraphs field. */
const TEXT = { bundle: 'text', fieldName: 'field_paragraphs' }

/**
 * The frame editor (`type: 'frame'`) — the rich-text variant that mounts a
 * CKEditor in a same-origin iframe and syncs to the editor over `postMessage`.
 * The `text` paragraph's `field_text` is a frame field: Drupal's form with the
 * field's text format.
 *
 * Editing is driven through the editor's own set-value channel (see
 * `setFrameValue`): typing keystrokes into a CKEditor instance inside an iframe
 * is unreliable under Playwright, so we exercise the parent↔iframe value path
 * deterministically instead.
 */
/**
 * Page lifecycle: one editor page shared, on the page "Empty". Each test adds
 * its own text, so the per-test uuid is unique. `afterEach` closes any open
 * editable via `saveByClickAway` — the overlay's `save` early-returns when
 * nothing changed, so closing test 1's pristine editable stores nothing.
 */
describe('Editable field — frame (rich text)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/empty', 'empty'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
  })

  test('opens the rich-text iframe pointed at the field editor', async () => {
    const uuid = (await addBlock(page, TEXT))!

    await openEditableField(page, 'field_text', uuid)

    // The iframe mounts, pointed at Drupal's form for this paragraph's field
    // (the adapter's `buildEditableFrameUrl`).
    await editableFrame(page)
    expect(await frameSrc(page)).toBe(
      `/en/paragraphs_blokkli/NODE/${seedUuid('node', 'empty')}/edit/rich_text/field_text/${uuid}?paragraphsBlokkli=true`,
    )
    // A rich-text (markup) field has no plaintext character counter.
    expect(
      await page.locator('[data-test="editable-char-count"]').count(),
    ).toBe(0)
  })

  test('editing the rich text updates the block and persists on save', async () => {
    const uuid = (await addBlock(page, TEXT))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'field_text', uuid)
    // Wait for the CKEditor to mount before pushing a value into it.
    await editableFrame(page)
    await setFrameValue(page, '<p>Edited rich text</p>')

    // The live preview writes the new (Drupal-formatted) value into the block.
    await waitForEditableText(page, 'field_text', host, 'Edited rich text')

    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await saveByClickAway(page)
    const variables = await stored
    expect(variables.uuid).toBe(uuid)
    expect(variables.fieldName).toBe('field_text')
    expect(variables.value).toContain('Edited rich text')
  })
})
