import { describe, expect, test } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils/e2e'

describe('Add Blocks', async () => {
  await setup()

  test('the add list element is rendered', async () => {
    const page = await createPage('/page/1?blokkliEditing=1')
    expect(page.locator('#bk-add-list')).toBeTruthy()
  })
})
