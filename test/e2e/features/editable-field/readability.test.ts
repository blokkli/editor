import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import {
  openEditableField,
  plaintextEditor,
  editableOverlay,
  readabilityState,
  saveByClickAway,
} from './../../support/editable'
import { setupEditorE2E } from './../../support/setup'

/**
 * The readability indicator shown inside the editable overlay (the `readability`
 * module is enabled in the playground, so `readability.isAvailable` is true).
 * Analysis is debounced (~500ms), so assertions poll. Bands depend on the
 * analyzer's thresholds, so we assert set-membership / the too-short state /
 * reactivity rather than an exact band value.
 *
 * Driven on the host `lead` field (plaintext, no max length) so we can feed
 * passages of any length.
 */
/**
 * Page lifecycle: one editor page shared. All tests edit the host `lead`
 * field — each `textarea.fill(...)` replaces the prior test's content, so
 * persisted lead state across tests doesn't affect readability assertions.
 * `afterEach` closes any open editable via `saveByClickAway`; the persisted
 * value (or its absence) is irrelevant because no test reads the recorder.
 */
describe('Editable field — readability', async () => {
  await setupEditorE2E()

  let page: Page

  const BANDS = ['easy', 'ok', 'hard']

  const PASSAGE =
    'The quick brown fox jumps over the lazy dog. ' +
    'This is a clear and simple sentence that anyone can read with ease.'

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
  })

  test('shows a readability band for a long enough passage', async () => {
    await openEditableField(page, 'lead')
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    await textarea.fill(PASSAGE)
    await expect
      .poll(async () => (await readabilityState(page)).band, { timeout: 5000 })
      .toBeTruthy()

    const state = await readabilityState(page)
    expect(BANDS).toContain(state.band)
    expect(state.tooShort).toBe(false)
  })

  test('shows the "too short" state for very little text', async () => {
    await openEditableField(page, 'lead')
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    await textarea.fill('Hi')
    await expect
      .poll(async () => (await readabilityState(page)).tooShort, {
        timeout: 5000,
      })
      .toBe(true)
    expect((await readabilityState(page)).band).toBeNull()
  })

  test('recomputes as the text changes', async () => {
    await openEditableField(page, 'lead')
    const textarea = plaintextEditor(page)
    await textarea.waitFor({ state: 'visible' })

    // Start too short…
    await textarea.fill('Hi')
    await expect
      .poll(async () => (await readabilityState(page)).tooShort, {
        timeout: 5000,
      })
      .toBe(true)

    // …then a full passage flips it to a scored band (debounced recompute).
    await textarea.fill(PASSAGE)
    await expect
      .poll(async () => (await readabilityState(page)).band, { timeout: 5000 })
      .toBeTruthy()
    expect((await readabilityState(page)).tooShort).toBe(false)
  })
})
