import { describe, expect, test } from 'vitest'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { formOverlay } from './../../support/overlays'
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
 */

/** The form overlay each add action opens when dropped. */
const ACTION_OVERLAYS = {
  template: 'templates',
  library: 'library',
  fragment: 'fragments',
} as const

describe('The add list actions', async () => {
  await setupEditorE2E()

  for (const [actionId, overlayId] of Object.entries(ACTION_OVERLAYS)) {
    test(`dropping the "${actionId}" action on the content field opens its form overlay`, async () => {
      const page = await openEditor()

      // No form overlay before the drop.
      expect(await formOverlay(page, overlayId).count()).toBe(0)

      await dropAddAction(page, actionId)

      await formOverlay(page, overlayId).waitFor({ state: 'visible' })

      await page.close()
    })
  }
})
