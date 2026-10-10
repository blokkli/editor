import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { addBlock, blockExists, selectBlock } from './support/blocks'
import { emitEvent } from './support/events'
import { clickItemAction } from './support/itemActions'
import { appMenuButton, openAppMenu } from './support/menu'
import { dialog, dialogSubmit } from './support/overlays'
import { withApp, editorPath, openEditor } from './support/session'
import { nextMutation } from './support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from './support/sandbox'

// The page "Broken" (content/nodes/broken.yml): a title in a gallery, which
// only allows images.
const EDITOR_PATH = editorPath('/en/broken', 'broken')
const GALLERY = seedUuid('paragraph', 'gallery')
const MISPLACED_TITLE = seedUuid('paragraph', 'misplaced-title')

function violations(page: Page) {
  return withApp(page, (app) =>
    app.state.violations.value.map((violation) => ({
      entityUuid: violation.entityUuid,
      propertyPath: violation.propertyPath,
    })),
  )
}

// Publishing needs a pending mutation.
async function openPublishDialog(page: Page): Promise<void> {
  await addBlock(page, { bundle: 'text', fieldName: 'field_paragraphs' })
  await openAppMenu(page)
  await appMenuButton(page, 'publish').click()
  await dialog(page, 'publish').waitFor({ state: 'visible' })
}

describe("Content the site doesn't allow", async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await dialog(page, 'publish').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'publish').waitFor({ state: 'hidden' })
    }
  })

  it('loads, with a violation on the gallery', async () => {
    expect(await blockExists(page, MISPLACED_TITLE)).toBe(true)
    expect(await violations(page)).toEqual([
      { entityUuid: GALLERY, propertyPath: 'field_paragraphs.0.target_id' },
    ])
  })

  it("isn't published for an editor", async () => {
    await openPublishDialog(page)
    await dialogSubmit(page).click()
    const items = page.locator('[data-test="publish-violation-item"]')
    await items.first().waitFor({ state: 'visible' })
    expect(await items.count()).toBe(1)
  })

  // Last two: they fix the page.
  //
  // A known bug: while editing, paragraphs_blokkli validates the paragraph
  // fields as stored, not as edited (getMutatedState() validates before
  // rebuildFields()). Drop `.fails` once it's fixed.
  it.fails('drops the violation once the misplaced paragraph is gone', async () => {
    await selectBlock(page, MISPLACED_TITLE)
    await clickItemAction(page, 'delete')
    await expect.poll(() => blockExists(page, MISPLACED_TITLE)).toBe(false)
    await expect.poll(() => violations(page)).toEqual([])
  })

  it('is published once the misplaced paragraph is gone', async () => {
    await openPublishDialog(page)
    const published = nextMutation(page, 'pbPublish')
    await dialogSubmit(page).click()
    await published

    // Publishing deleted the edit state: a new one, without mutations, starts
    // from what Drupal published.
    await page.close()
    page = await openEditor(sandbox, 'Anna Keller', EDITOR_PATH)
    expect(await withApp(page, (app) => app.state.mutations.value.length)).toBe(
      0,
    )
    expect(await blockExists(page, MISPLACED_TITLE)).toBe(false)
    expect(await blockExists(page, GALLERY)).toBe(true)
  })
})
