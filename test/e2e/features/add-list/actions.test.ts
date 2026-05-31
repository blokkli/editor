import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { closeFormOverlay, formOverlay } from './../../support/overlays'
import { dropAddAction } from './../../support/blocks'

/**
 * The add list offers three add actions — `template`, `library` (from library)
 * and `fragment` — all of which can be dropped onto the host entity's `content`
 * block field. Dropping one runs its `defineDropHandler('action')` handler,
 * which invokes the action's callback; each action's callback opens a form
 * overlay (`data-test="form-overlay-<id>"`).
 *
 * Rather than perform the canvas pointer drag, `dropAddAction` emits
 * `dragging:drop` directly with an action draggable built from the live action
 * plugin — the exact event the dragging-overlay's drop dispatcher consumes.
 *
 * Page lifecycle: one editor page is opened in `beforeAll` and shared by all
 * three drops. After each drop, the form overlay is closed via `overlay:close`
 * (bypassing the `confirmClose` two-click dance) so the next test starts with
 * no overlay open. The dropped actions don't mutate page content — they only
 * open a form — so no other cleanup is needed.
 */

/** The form overlay each add action opens when dropped. */
const ACTION_OVERLAYS = {
  template: 'templates',
  library: 'library',
  fragment: 'fragments',
} as const

describe('The add list actions', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  for (const [actionId, overlayId] of Object.entries(ACTION_OVERLAYS)) {
    test(`dropping the "${actionId}" action on the content field opens its form overlay`, async () => {
      // No form overlay before the drop.
      expect(await formOverlay(page, overlayId).count()).toBe(0)

      await dropAddAction(page, actionId)

      await formOverlay(page, overlayId).waitFor({ state: 'visible' })

      // Tidy up so the next test sees no open overlay.
      await closeFormOverlay(page, overlayId)
    })
  }
})
