import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'

/**
 * The add list offers three add actions — `template`, `library` (from library)
 * and `fragment` — all of which can be dropped onto the host entity's `content`
 * block field. Dropping one runs its `defineDropHandler('action')` handler,
 * which invokes the action's callback; each action's callback opens a form
 * overlay (`data-test="form-overlay-<id>"`).
 *
 * Rather than perform the canvas pointer drag, we emit `dragging:drop` directly
 * with an action draggable built from the live action plugin — the exact event
 * the dragging-overlay's drop dispatcher (`onDrop`) consumes.
 */

/** The form overlay each add action opens when dropped. */
const ACTION_OVERLAYS = {
  template: 'templates',
  library: 'library',
  fragment: 'fragments',
} as const

/**
 * Drop the given add action onto the host entity's `content` field by emitting
 * the `dragging:drop` event the drop dispatcher listens for.
 */
function dropActionOnContentField(page: Page, actionId: string): Promise<void> {
  return page.evaluate((actionId) => {
    const app = window.__BLOKKLI__!.app!
    const action = app.plugins
      .get('addAction')
      .find((candidate) => candidate.id === actionId)
    if (!action) {
      throw new Error(`Add action "${actionId}" is not registered.`)
    }

    const ctx = app.context.value
    const field = app.fields.find(ctx.entityUuid, 'content')
    if (!field) {
      throw new Error('The host entity has no registered "content" field.')
    }

    app.eventBus.emit('dragging:drop', {
      items: [
        {
          itemType: 'action',
          action,
          actionType: action.id,
          itemBundle: action.itemBundle,
          element: () => document.body,
        },
      ],
      field,
      host: { type: ctx.entityType, uuid: ctx.entityUuid, fieldName: 'content' },
      preceedingUuid: null,
    })
  }, actionId)
}

describe('The add list actions', async () => {
  await setupEditorE2E()

  for (const [actionId, overlayId] of Object.entries(ACTION_OVERLAYS)) {
    test(`dropping the "${actionId}" action on the content field opens its form overlay`, async () => {
      const page = await openEditor()

      // No form overlay before the drop.
      expect(
        await page.locator(`[data-test="form-overlay-${overlayId}"]`).count(),
      ).toBe(0)

      await dropActionOnContentField(page, actionId)

      await page
        .locator(`[data-test="form-overlay-${overlayId}"]`)
        .waitFor({ state: 'visible' })

      await page.close()
    })
  }
})
