import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { dismissMessages, shownMessages } from './support/overlays'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor, withApp } from './support/session'

/** What Drupal says to a title that is longer than its field. */
const REASON = 'Title: may not be longer than 255 characters.'

/** What a feature says when its mutation fails. */
const FEATURE_MESSAGE = 'The title could not be changed.'

/**
 * Runs a mutation that Drupal refuses, the way the editor's features run
 * theirs: a title that is too long for the page.
 */
function setLongTitle(
  page: Page,
  errorMessage?: string | false,
): Promise<boolean> {
  return page.evaluate((errorMessage) => {
    const app = window.__BLOKKLI__!.app!
    return app.state.mutateWithLoadingState(
      () =>
        app.adapter.updateEntityFieldValue!({
          fieldName: 'title',
          fieldValue: 'a'.repeat(256),
        }),
      errorMessage,
    )
  }, errorMessage)
}

/**
 * What the editor says when a mutation fails.
 *
 * A mutation that Drupal refuses comes with its reason, which is for the user
 * to read: it's the message, or it stands beneath what the feature says.
 * Anything else that fails is an error, with details to look into.
 *
 * The editor offers no way to write a title that is too long, so the specs
 * run the mutation as a feature does (see `field-access.test.ts` for what
 * Drupal answers).
 *
 * Page lifecycle: one editor page for Anna Keller on the page "Blocks".
 * Nothing is stored: every mutation fails.
 */
describe('A mutation that fails', async () => {
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

  afterEach(async () => {
    // A dismissed message takes a moment to leave.
    await dismissMessages(page)
    await expect.poll(() => shownMessages(page)).toEqual([])
  })

  it("says Drupal's reason when the feature says nothing", async () => {
    expect(await setLongTitle(page)).toBe(false)
    expect(await shownMessages(page)).toEqual([
      { text: REASON, additional: null, hasDetails: false },
    ])
  })

  it("says Drupal's reason beneath what the feature says", async () => {
    expect(await setLongTitle(page, FEATURE_MESSAGE)).toBe(false)
    expect(await shownMessages(page)).toEqual([
      { text: FEATURE_MESSAGE, additional: REASON, hasDetails: false },
    ])
  })

  it('says nothing for a feature that shows the failure itself', async () => {
    expect(await setLongTitle(page, false)).toBe(false)
    expect(await shownMessages(page)).toEqual([])
  })

  it('says what the violations say when there are no errors', async () => {
    // Drupal gives every refused mutation an error, so this is the answer of
    // another backend.
    const applied = await page.evaluate(() =>
      window.__BLOKKLI__!.app!.state.mutateWithLoadingState(() =>
        Promise.resolve({
          success: false,
          violations: [
            { message: 'The lead is missing.' },
            { message: 'The teaser has no image.' },
          ],
        }),
      ),
    )
    expect(applied).toBe(false)
    expect(await shownMessages(page)).toEqual([
      {
        text: 'The lead is missing.\nThe teaser has no image.',
        additional: null,
        hasDetails: false,
      },
    ])
  })

  it('offers the details of anything else that fails', async () => {
    const applied = await page.evaluate(
      (errorMessage) =>
        window.__BLOKKLI__!.app!.state.mutateWithLoadingState(
          () => Promise.reject(new Error('The request failed.')),
          errorMessage,
        ),
      FEATURE_MESSAGE,
    )
    expect(applied).toBe(false)
    expect(await shownMessages(page)).toEqual([
      {
        text: FEATURE_MESSAGE,
        additional: 'The request failed.',
        hasDetails: true,
      },
    ])
  })

  // Last: it looks at what the others left behind.
  it('stores nothing and leaves the editor usable', async () => {
    expect(
      await withApp(page, (app) => ({
        mutations: app.state.mutations.value.length,
        isLoading: app.state.isLoading.value,
      })),
    ).toEqual({ mutations: 0, isLoading: false })
  })
})
