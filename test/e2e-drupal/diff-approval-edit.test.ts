import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { getHostContext, editorPath, openEditor } from './support/session'
import { addBlock } from './support/blocks'
import {
  editableState,
  editableText,
  waitForEditableText,
  plaintextEditor,
  editableOverlay,
  editableFrame,
  setFrameValue,
  saveByClickAway,
  discardEditable,
  blockHost,
} from './support/editable'
import {
  applyFieldDiff,
  applyChunkFieldDiff,
  cancelDiff,
  applyDiff,
  editDiff,
  editDiffFromHighlight,
} from './support/diff'
import { undo } from './support/toolbar'
import { openSidebar } from './support/sidebar'
import type { EntityContext } from '../../src/runtime/types'
import { nextMutation } from './support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'

/**
 * E2E for the DiffApproval "Edit" action: manually revising a suggested value
 * in the editable-field overlay before applying.
 *
 * The scenarios cover the three agreed behaviours:
 *  - plain field: the overlay is seeded with the PROPOSED value (not the
 *    field's current value), the saved revision replaces the diff preview and
 *    is what apply persists (with undo reverting it),
 *  - discarding an edit changes nothing — the original suggestion stays,
 *  - segmented (frame) field: the overlay is seeded with the merged state of
 *    the current chunk decisions (accepted → proposed, rejected → original)
 *    and saving collapses the item to a single whole-field unit.
 *
 * Page lifecycle: one editor page with the `test-cases` sidebar open (the
 * imperative `.test` API registers when its pane mounts), on the page
 * "Reading" (content/nodes/reading.yml): its `field_lead` is the plain field.
 * Each test reads its own preconditions fresh; the frame test adds its own
 * text.
 */
describe('DiffApproval manual edit', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let host: EntityContext

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/reading', 'reading'),
    )
    host = await getHostContext(page)
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('editing a plain suggestion revises the diff and applies the revision', async () => {
    const original = await editableText(page, 'field_lead', host)
    const proposed = original + ' PROPOSED'
    const revised = original + ' REVISED'

    const done = applyFieldDiff(page, 'field_lead', proposed)
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })

    // Seeded with the proposed value, not the field's current value.
    await expect.poll(() => plaintextEditor(page).inputValue()).toBe(proposed)

    await plaintextEditor(page).fill(revised)
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    // The preview now shows the revised value as diff markup against the
    // original field value.
    await expect
      .poll(
        async () =>
          (await editableState(page, 'field_lead', host))?.hasDiffMarkup,
      )
      .toBe(true)
    const state = await editableState(page, 'field_lead', host)
    expect(state?.diffActive).toBe(true)
    expect(state?.html).toContain('REVISED')

    const stored = nextMutation(page, 'pbUpdateHostEntityFieldValue')
    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)
    expect((await stored).value).toBe(revised)

    await waitForEditableText(page, 'field_lead', host, revised)
    expect(await page.locator('[data-bk-diff-active]').count()).toBe(0)

    const undone = nextMutation(page, 'pbSetHistoryIndex')
    await undo(page)
    await undone
    await waitForEditableText(page, 'field_lead', host, original)
  })

  test('discarding an edit keeps the original suggestion', async () => {
    const original = await editableText(page, 'field_lead', host)
    const proposed = original + ' PROPOSED'

    const done = applyFieldDiff(page, 'field_lead', proposed)
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    // The second entry point: the Edit button on the in-canvas highlight pill.
    await editDiffFromHighlight(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })
    await plaintextEditor(page).fill('draft that gets thrown away')
    await discardEditable(page)
    await overlay.waitFor({ state: 'detached' })

    // The diff still previews the unmodified proposal.
    await expect
      .poll(
        async () =>
          (await editableState(page, 'field_lead', host))?.hasDiffMarkup,
      )
      .toBe(true)
    const state = await editableState(page, 'field_lead', host)
    expect(state?.html).toContain('PROPOSED')
    expect(state?.html).not.toContain('thrown away')

    await cancelDiff(page)
    const { applied } = await done
    expect(applied).toBe(false)

    await waitForEditableText(page, 'field_lead', host, original)
    expect(await page.locator('[data-bk-diff-active]').count()).toBe(0)
  })

  test('editing a segmented frame field seeds the merged state and collapses to one unit', async () => {
    const uuid = (await addBlock(page, {
      bundle: 'text',
      fieldName: 'field_paragraphs',
    }))!
    const textHost = await blockHost(page, uuid)

    const before =
      '<p>First paragraph original.</p><p>Second paragraph stays.</p><p>Third paragraph original.</p>'
    const after =
      '<p>First paragraph rewritten.</p><p>Second paragraph stays.</p><p>Third paragraph rewritten.</p>'

    const done = applyChunkFieldDiff(page, {
      fieldName: 'field_text',
      uuid,
      before,
      after,
    })
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    const segmentRects = page.locator(
      '[data-test="diff-approval-highlight-item"][data-test-kind="segment"]',
    )
    await expect.poll(() => segmentRects.count()).toBe(2)

    // Reject the active (first changed) chunk, then edit the field.
    await page.keyboard.press('Space')
    await editDiff(page)

    // The frame editor mounts and receives the merged seed: rejected chunk →
    // original text, accepted chunk → proposed text. Drupal's form echoes the
    // pushed value, so the live preview shows the seed in the block.
    await editableFrame(page)
    await page.waitForFunction(
      ({ fieldName, host }) => {
        const el = window.__BLOKKLI__!.app!.directive.findEditableElement(
          fieldName,
          host,
        )
        const text = el?.textContent ?? ''
        return (
          text.includes('First paragraph original.') &&
          text.includes('Third paragraph rewritten.')
        )
      },
      { fieldName: 'field_text', host: textHost },
    )

    await setFrameValue(page, '<p>Completely revised by hand.</p>')
    // Wait for the iframe to echo the pushed value into the live preview —
    // saving earlier would still carry the seed (a no-op edit).
    await page.waitForFunction(
      ({ fieldName, host }) => {
        const el = window.__BLOKKLI__!.app!.directive.findEditableElement(
          fieldName,
          host,
        )
        return !!el?.textContent?.includes('Completely revised by hand.')
      },
      { fieldName: 'field_text', host: textHost },
    )
    await saveByClickAway(page)
    await editableOverlay(page).waitFor({ state: 'detached' })

    // The item collapsed: the chunk toggles are gone, one whole-field unit
    // remains and the toolbar reflects it.
    await expect.poll(() => segmentRects.count()).toBe(0)
    await expect
      .poll(() =>
        page
          .locator(
            '[data-test="diff-approval-highlight-item"][data-test-kind="whole"]',
          )
          .count(),
      )
      .toBe(1)
    expect(
      await page
        .locator('[data-test="diff-approval-toolbar"]')
        .getAttribute('data-test-unit-kind'),
    ).toBe('whole')

    const stored = nextMutation(page, 'pbUpdateFieldValue')
    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)
    expect((await stored).value).toContain('Completely revised by hand.')

    await expect
      .poll(
        async () => (await editableState(page, 'field_text', textHost))?.text,
      )
      .toContain('Completely revised by hand.')
    expect(await page.locator('[data-bk-diff-active]').count()).toBe(0)
  })
})
