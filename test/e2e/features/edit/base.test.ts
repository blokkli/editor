import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock, selectBlock } from './../../support/blocks'
import { itemActionDisabled } from './../../support/itemActions'

/**
 * The edit feature (`features/edit/index.vue`) disables editing without the
 * bundle's `edit` permission. The permission is denied with the generic
 * `{ permissions }` override (`playground/app/mock/permissionOverrides.ts`);
 * we assert the native `disabled` state via `itemActionDisabled`, never
 * translated copy.
 *
 * The rest of the feature runs against Drupal
 * (`test/e2e-drupal/features/edit/base`); this case follows once a test user
 * lacks an edit permission.
 */
describe('The edit feature', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH, {
      permissions: { blockPermissions: { text: ['add', 'delete'] } },
    })
  })

  afterAll(async () => {
    await page.close()
  })

  test('without edit permission, editing is disabled', async () => {
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)
  })
})
