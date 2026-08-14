import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { addBlock } from '../../support/blocks'
import { setupEditorE2E } from '../../support/setup'
import {
  autoTranslateMockEntry,
  openTranslateDialog,
} from '../../support/translations'

/**
 * The flow this all started from: bulk auto-translation could not reach a link
 * title, because everything upstream of it keyed on text FIELDS. Addressed by
 * property path (`link.title`), the title becomes an ordinary translatable row
 * and needs no special handling in the workbench.
 */
describe('link field titles: translating', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor('/de/page/1?blokkliEditing=1&testing=true', {
      localStorage: autoTranslateMockEntry(),
    })
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test('the title is offered as a translatable row', async () => {
    const uuid = await addBlock(page, { bundle: 'link', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add link block')

    await openTranslateDialog(page)

    const row = page.locator(
      `[data-test="translations-batch-row"][data-test-key="${uuid}:link.title"]`,
    )
    expect(await row.count()).toBe(1)
  })
})
