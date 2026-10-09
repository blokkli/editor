import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { toolbarButton } from './../../support/toolbar'

/**
 * The deep link of an `edit-state:approved` notification. Drupal has no such
 * notification, so this one stays with the mock: its seed
 * (`playground/app/mock/notificationStorage.ts`) has `notif-3`, the third
 * newest, so on the first page. The rest of the feature runs against Drupal
 * (`test/e2e-drupal/features/notifications`).
 */
describe('The notifications feature', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  test('an approval links to the page without a comment param', async () => {
    await toolbarButton(page, 'notifications').click()

    // `notif-3` — edit-state:approved with host=1 and no relatedEntityUuid.
    const approved = page.locator('[data-test="notification-notif-3"]')
    await approved.waitFor({ state: 'visible' })
    expect(await approved.evaluate((el) => el.tagName)).toBe('A')
    const approvedHref = await approved.getAttribute('href')
    expect(approvedHref).toContain('blokkliEditing=1')
    expect(approvedHref).not.toContain('blokkliComment=')
  })
})
