import { describe, expect, test } from 'vitest'
import { openEditor } from './support/editor'
import { setupEditorE2E } from './support/setup'

describe('Add Blocks', async () => {
  await setupEditorE2E()

  test('the add list element is rendered', async () => {
    const page = await openEditor()
    // `.count()` is asserted (not the locator itself — a locator is always
    // truthy, which is how this spec used to pass against a non-built app).
    expect(await page.locator('#bk-add-list').count()).toBe(1)
    await page.close()
  })
})
