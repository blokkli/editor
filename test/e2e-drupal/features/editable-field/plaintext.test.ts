import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
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
} from '../../support/editable'
import { countMutations, nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/** A title, added to the page's paragraphs field: its `field_title` is optional. */
const TITLE = { bundle: 'title', fieldName: 'field_paragraphs' }

/**
 * A call to action, added to the page's paragraphs field: its `field_title` is
 * required, and a new one is "Lorem ipsum dolor".
 */
const CALL_TO_ACTION = {
  bundle: 'call_to_action',
  fieldName: 'field_paragraphs',
}

/** The first link of the front page's call to action: it has no text. */
const LINK = seedUuid('paragraph', 'home-link')

/**
 * The plaintext editor (`type: 'plain'`) — the textarea variant of the inline
 * editable overlay. Covers the value path (save → DOM + `pbUpdateFieldValue`),
 * discard, the unchanged/required/validation branches, the character counter
 * and the implicit save points (click-away, switching editables).
 *
 * Already covered elsewhere (not repeated here): auto-open after add
 * (`add-block-drag.test.ts`) and inline editing of the host `lead` after a diff
 * cycle (`diff-approval-restore.test.ts`).
 */
/**
 * Page lifecycle: one editor page shared, on the front page (its call to
 * action has a link without a text). Each test adds its own paragraph (a
 * title or a call to action), so per-test uuids don't collide. `afterEach`
 * closes any open editable via `saveByClickAway` (the overlay's `save` is a
 * no-op when nothing changed). Every request of `pbUpdateFieldValue` is
 * counted, so a test can tell that nothing was stored.
 */
describe('Editable field — plaintext', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let saves: () => number

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', editorPath('/en', 'home'))
    saves = countMutations(page, 'pbUpdateFieldValue')
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

  test('saving persists the value and writes it into the block DOM', async () => {
    const uuid = (await addBlock(page, TITLE))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // The overlay reports the field type, and focuses the textarea on open.
    expect(await editableOverlay(page).getAttribute('data-test-type')).toBe(
      'plain',
    )
    expect(await textarea.evaluate((el) => el === document.activeElement)).toBe(
      true,
    )

    await textarea.fill('Edited title')
    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await textarea.press('Enter')

    await waitForEditableText(page, 'field_title', host, 'Edited title')
    expect(await stored).toMatchObject({
      uuid,
      fieldName: 'field_title',
      value: 'Edited title',
    })
  })

  test('discarding restores the original value and persists nothing', async () => {
    const uuid = (await addBlock(page, CALL_TO_ACTION))!
    const host = await blockHost(page, uuid)
    const original = await editableText(page, 'field_title', host)
    const saved = saves()

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // Discard is disabled until the value actually changes.
    expect(await discardButton(page).isDisabled()).toBe(true)
    await textarea.fill('Throwaway change')
    await expect.poll(() => discardButton(page).isDisabled()).toBe(false)

    await discardEditable(page)

    await waitForEditableText(page, 'field_title', host, original)
    expect(saves()).toBe(saved)
  })

  test('closing without changes persists nothing', async () => {
    const uuid = (await addBlock(page, TITLE))!
    const saved = saves()

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // Submit without editing — `hasChanged` is false, so nothing is persisted.
    await textarea.press('Enter')
    await textarea.waitFor({ state: 'hidden' })

    expect(saves()).toBe(saved)
  })

  test('a required field left empty restores instead of saving', async () => {
    // The call to action's `field_title` is required (and capped at 255 chars).
    const uuid = (await addBlock(page, CALL_TO_ACTION))!
    const host = await blockHost(page, uuid)
    const original = await editableText(page, 'field_title', host)
    const saved = saves()

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    expect(await textarea.getAttribute('maxlength')).toBe('255')

    await textarea.fill('')
    // Enter is a no-op while a required field is empty, so close via click-away:
    // the overlay detects the validation error and restores the original value.
    await saveByClickAway(page)

    await waitForEditableText(page, 'field_title', host, original)
    expect(saves()).toBe(saved)
  })

  test('an empty field is seeded from its rendered template fallback', async () => {
    // The link has no text of its own: it renders `title || <its target's
    // label>`, the title of the page it links to. The overlay seeds the editor
    // with that visible text (plain fields only) instead of opening empty —
    // but the seed must never be persisted on its own.
    const host = await blockHost(page, LINK)
    const saved = saves()

    // The stored value is empty; the DOM renders the fallback.
    await waitForEditableText(page, 'field_title', host, 'Blocks')
    expect(await storedFieldValue(page, LINK, 'field_title')).toBe(null)

    // Opening seeds the editor with the visible fallback text …
    await openEditableField(page, 'field_title', LINK)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    expect(await textarea.inputValue()).toBe('Blocks')

    // … but it doesn't count as a change: closing unchanged persists nothing.
    await textarea.press('Enter')
    await textarea.waitFor({ state: 'hidden' })
    expect(saves()).toBe(saved)

    // Editing the seeded text persists the edited value.
    await openEditableField(page, 'field_title', LINK)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('Edited link')
    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await textarea.press('Enter')
    expect(await stored).toMatchObject({
      fieldName: 'field_title',
      value: 'Edited link',
    })
    // The count saw it: "nothing persisted" above isn't a count that never
    // counts.
    expect(saves()).toBe(saved + 1)
  })

  test('the character counter reflects the typed length', async () => {
    const uuid = (await addBlock(page, TITLE))!

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    await textarea.fill('Twelve chars') // 12 characters
    await expect.poll(() => charCount(page)).toBe(12)
  })

  test('clicking away saves the field', async () => {
    const uuid = (await addBlock(page, TITLE))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('Saved on click-away')

    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await saveByClickAway(page)

    await waitForEditableText(page, 'field_title', host, 'Saved on click-away')
    expect((await stored).value).toBe('Saved on click-away')
  })

  test('opening another editable saves the current one', async () => {
    const uuid = (await addBlock(page, CALL_TO_ACTION))!
    const host = await blockHost(page, uuid)

    await openEditableField(page, 'field_title', uuid)
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })
    await textarea.fill('Auto-saved on switch')

    // Switch to the call to action's `field_lead`; the title overlay unmounts
    // and saves.
    const stored = nextMutation(page, 'pbUpdateFieldValue')
    const opened = nextEditableOpen(page)
    await openEditableField(page, 'field_lead', uuid)
    expect(await opened).toBe('field_lead')

    await waitForEditableText(page, 'field_title', host, 'Auto-saved on switch')
    expect(await stored).toMatchObject({
      fieldName: 'field_title',
      value: 'Auto-saved on switch',
    })
  })
})
