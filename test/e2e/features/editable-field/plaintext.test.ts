import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { addBlock } from './../../support/blocks'
import {
  openEditableField,
  plaintextEditor,
  editableText,
  waitForEditableText,
  editableOverlay,
  discardButton,
  discardEditable,
  charCount,
  blockHost,
  saveByClickAway,
  nextEditableOpen,
  storedFieldValue,
} from './../../support/editable'
import {
  clearAdapterCalls,
  recordedAdapterCalls,
  waitForAdapterCall,
} from './../../support/recorder'
import { setupEditorE2E } from './../../support/setup'

/** The recorded `updateFieldValue` payload (block-field saves). */
type FieldValueCall = { uuid?: string; fieldName: string; fieldValue: string }

/** Recorded `updateFieldValue` calls so far (the recorder is per-test isolated). */
async function fieldValueCalls(
  page: Parameters<typeof recordedAdapterCalls>[0],
) {
  const calls = await recordedAdapterCalls<FieldValueCall>(page)
  return calls.filter((c) => c.method === 'updateFieldValue')
}

/**
 * The plaintext editor (`type: 'plain'`) — the textarea variant of the inline
 * editable overlay. Covers the value path (save → DOM + adapter call), discard,
 * the unchanged/required/validation branches, the character counter and the
 * implicit save points (click-away, switching editables).
 *
 * Already covered elsewhere (not repeated here): auto-open after add
 * (`add-block-drag.test.ts`) and inline editing of the host `lead` after a diff
 * cycle (`diff-approval-restore.test.ts`).
 */
/**
 * Page lifecycle: one editor page shared. Each test adds its own block
 * (card / title), so per-test uuids don't collide. `afterEach` closes any
 * open editable via `saveByClickAway` (the overlay's `save` is a no-op when
 * nothing changed; on a dirty close it persists, but that doesn't pollute
 * subsequent tests because the recorder is also cleared) and clears the
 * adapter recorder so each test's `fieldValueCalls`/`waitForAdapterCall`
 * sees only its own writes.
 */
describe('Editable field — plaintext', async () => {
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

  test('saving persists the value and writes it into the block DOM', async () => {
    const uuid = (await addBlock(page, { bundle: 'card' }))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // The overlay reports the field type, and focuses the textarea on open.
    expect(await editableOverlay(page).getAttribute('data-test-type')).toBe(
      'plain',
    )
    expect(await textarea.evaluate((el) => el === document.activeElement)).toBe(
      true,
    )

    await textarea.fill('Edited card title')
    await textarea.press('Enter')

    await waitForEditableText(page, 'title', host, 'Edited card title')
    const call = await waitForAdapterCall<FieldValueCall>(
      page,
      'updateFieldValue',
    )
    expect(call.uuid).toBe(uuid)
    expect(call.fieldName).toBe('title')
    expect(call.fieldValue).toBe('Edited card title')
  })

  test('discarding restores the original value and persists nothing', async () => {
    const uuid = (await addBlock(page, { bundle: 'card' }))!
    const host = await blockHost(page, uuid)
    const original = await editableText(page, 'title', host)

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // Discard is disabled until the value actually changes.
    expect(await discardButton(page).isDisabled()).toBe(true)
    await textarea.fill('Throwaway change')
    await expect.poll(() => discardButton(page).isDisabled()).toBe(false)

    await discardEditable(page)

    await waitForEditableText(page, 'title', host, original)
    expect(await fieldValueCalls(page)).toHaveLength(0)
  })

  test('closing without changes persists nothing', async () => {
    const uuid = (await addBlock(page, { bundle: 'card' }))!

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // Submit without editing — `hasChanged` is false, so nothing is persisted.
    await textarea.press('Enter')
    await textarea.waitFor({ state: 'hidden' })

    expect(await fieldValueCalls(page)).toHaveLength(0)
  })

  test('a required field left empty restores instead of saving', async () => {
    // The `title` block's `title` field is required (and capped at 50 chars).
    const uuid = (await addBlock(page, { bundle: 'title' }))!
    const host = await blockHost(page, uuid)
    const original = await editableText(page, 'title', host)

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    expect(await textarea.getAttribute('maxlength')).toBe('50')

    await textarea.fill('')
    // Enter is a no-op while a required field is empty, so close via click-away:
    // the overlay detects the validation error and restores the original value.
    await saveByClickAway(page)

    await waitForEditableText(page, 'title', host, original)
    expect(await fieldValueCalls(page)).toHaveLength(0)
  })

  test('an empty field is seeded from its rendered template fallback', async () => {
    // The `title` block's optional `tagline` renders `tagline || 'Fallback'`,
    // so an empty stored value still shows text in the DOM. The overlay seeds
    // the editor with that visible text (plain fields only) instead of opening
    // empty — but the seed must never be persisted on its own.
    const uuid = (await addBlock(page, { bundle: 'title' }))!
    const host = await blockHost(page, uuid)

    // Empty the field first — a new block defaults the tagline to 'Tagline'.
    await openEditableField(page, 'tagline', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('')
    await textarea.press('Enter')
    await textarea.waitFor({ state: 'hidden' })
    await waitForAdapterCall(page, 'updateFieldValue')
    await clearAdapterCalls(page)

    // The stored value is now empty; the DOM renders the template fallback.
    await waitForEditableText(page, 'tagline', host, 'Fallback')
    expect(await storedFieldValue(page, uuid, 'tagline')).toBe(null)

    // Reopening seeds the editor with the visible fallback text …
    await openEditableField(page, 'tagline', uuid)
    await textarea.waitFor({ state: 'visible' })
    expect(await textarea.inputValue()).toBe('Fallback')

    // … but it doesn't count as a change: closing unchanged persists nothing.
    await textarea.press('Enter')
    await textarea.waitFor({ state: 'hidden' })
    expect(await fieldValueCalls(page)).toHaveLength(0)

    // Editing the seeded text persists the edited value.
    await openEditableField(page, 'tagline', uuid)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('Edited tagline')
    await textarea.press('Enter')
    const call = await waitForAdapterCall<FieldValueCall>(
      page,
      'updateFieldValue',
    )
    expect(call.fieldName).toBe('tagline')
    expect(call.fieldValue).toBe('Edited tagline')
  })

  test('the character counter reflects the typed length', async () => {
    const uuid = (await addBlock(page, { bundle: 'title' }))!

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    await textarea.fill('Twelve chars') // 12 characters
    await expect.poll(() => charCount(page)).toBe(12)
  })

  test('clicking away saves the field', async () => {
    const uuid = (await addBlock(page, { bundle: 'card' }))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('Saved on click-away')

    await saveByClickAway(page)

    await waitForEditableText(page, 'title', host, 'Saved on click-away')
    const call = await waitForAdapterCall<FieldValueCall>(
      page,
      'updateFieldValue',
    )
    expect(call.fieldValue).toBe('Saved on click-away')
  })

  test('opening another editable saves the current one', async () => {
    const uuid = (await addBlock(page, { bundle: 'card' }))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('Auto-saved on switch')

    // Switch to the card's `text` field; the title overlay unmounts and saves.
    const opened = nextEditableOpen(page)
    await openEditableField(page, 'text', uuid)
    expect(await opened).toBe('text')

    await waitForEditableText(page, 'title', host, 'Auto-saved on switch')
    const call = await waitForAdapterCall<FieldValueCall>(
      page,
      'updateFieldValue',
    )
    expect(call.fieldName).toBe('title')
    expect(call.fieldValue).toBe('Auto-saved on switch')
  })
})
