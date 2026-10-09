import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  openEditableField,
  plaintextEditor,
  editableOverlay,
  editableFrame,
  setFrameValue,
  saveByClickAway,
} from '../../../e2e/support/editable'
import { undo } from '../../../e2e/support/toolbar'
import { openSidebar } from '../../../e2e/support/sidebar'
import { runComponentTool } from '../../../e2e/support/agent'
import { applyDiff } from '../../../e2e/support/diff'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'

// A title and a text of the page "Blocks" (content/nodes/blocks.yml). The
// sandbox's Title component renders `{{ title }}`: Vue keeps a reference to
// that text node and only ever updates it. Its Text component renders
// `v-html="text"`: Vue replaces the element's children.
const TITLE = seedUuid('paragraph', 'first-title')
const TEXT = seedUuid('paragraph', 'first-text')
const SECOND_TEXT = seedUuid('paragraph', 'second-text')

/** A paragraph's text, as shown on the page. */
function shownText(page: Page, uuid: string): Promise<string | undefined> {
  return page.evaluate(
    (uuid) =>
      document.querySelector(`[data-bk-uuid="${uuid}"]`)?.textContent?.trim(),
    uuid,
  )
}

/**
 * The editable overlay and the diff approval preview a value by writing it into
 * the field's element, which replaces Vue's nodes. Once the value is stored,
 * the field must render through Vue again (`useEditableFieldOverride`):
 * otherwise every later change (an undo, another user's edit) updates a node
 * that's no longer in the page, and the field keeps showing the edited text.
 * Unless Vue re-rendered the element itself in the meantime, which `v-html`
 * does: then the nodes it replaced are outdated.
 */
describe('An edited field', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  test('shows the previous text again after an undo', async () => {
    expect(await shownText(page, TITLE)).toBe('First title')

    await openEditableField(page, 'field_title', TITLE)
    await plaintextEditor(page).fill('Edited title')
    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await page.keyboard.press('Enter')
    await stored
    await editableOverlay(page).waitFor({ state: 'detached' })
    expect(await shownText(page, TITLE)).toBe('Edited title')

    const undone = nextMutation(page, 'pbSetHistoryIndex')
    await undo(page)
    await undone
    await expect.poll(() => shownText(page, TITLE)).toBe('First title')
  })

  test('rendered with v-html, shows the stored text, then the previous text after an undo', async () => {
    // Vue re-renders the element with the stored text before the overlay hands
    // it back: the nodes it kept aside are outdated then.
    await openEditableField(page, 'field_text', SECOND_TEXT)
    await editableFrame(page)
    await setFrameValue(page, '<p>Edited text.</p>')
    // The preview shows the value the frame formats with Drupal's text format:
    // a round trip, slow under load.
    await expect
      .poll(() => shownText(page, SECOND_TEXT), { timeout: 5000 })
      .toBe('Edited text.')

    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await saveByClickAway(page)
    await stored
    await editableOverlay(page).waitFor({ state: 'detached' })
    expect(await shownText(page, SECOND_TEXT)).toBe('Edited text.')

    const undone = nextMutation(page, 'pbSetHistoryIndex')
    await undo(page)
    await undone
    await expect.poll(() => shownText(page, SECOND_TEXT)).toBe('Second text.')
  })

  test('rendered with v-html, shows an applied suggestion, then the previous text after an undo', async () => {
    await openSidebar(page, 'test-cases')
    const done = runComponentTool(page, 'update_text_fields', {
      updates: [
        {
          uuid: TEXT,
          fieldName: 'field_text',
          value: '<p>Suggested text.</p>',
        },
      ],
    })
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    const stored = nextMutation(page, 'pbBulkUpdateFieldValues')
    await applyDiff(page)
    await done
    await stored
    await expect.poll(() => shownText(page, TEXT)).toBe('Suggested text.')

    const undone = nextMutation(page, 'pbSetHistoryIndex')
    await undo(page)
    await undone
    await expect.poll(() => shownText(page, TEXT)).toBe('First text.')
  })
})
