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

// The page "Misplaced" (content/nodes/misplaced.yml): a call to action, which
// a page doesn't allow.
const MISPLACED_PATH = editorPath('/en/misplaced', 'misplaced')
const MISPLACED_PAGE = seedUuid('node', 'misplaced')

function violations(page: Page) {
  return withApp(page, (app) =>
    app.state.violations.value.map((violation) => ({
      entityType: violation.entityType,
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
  let misplacedPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, misplacedPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', EDITOR_PATH),
      openEditor(sandbox, 'Anna Keller', MISPLACED_PATH),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), misplacedPage.close()])
  })

  afterEach(async () => {
    for (const p of [page, misplacedPage]) {
      if (await dialog(p, 'publish').isVisible()) {
        await emitEvent(p, 'overlay:close')
        await dialog(p, 'publish').waitFor({ state: 'hidden' })
      }
    }
  })

  it('loads, with a violation on the gallery', async () => {
    expect(await blockExists(page, MISPLACED_TITLE)).toBe(true)
    expect(await violations(page)).toEqual([
      {
        entityType: 'paragraph',
        entityUuid: GALLERY,
        propertyPath: 'field_paragraphs.0.target_id',
      },
    ])
  })

  // E2E sandboxes validate the paragraphs fields of a page too.
  it('names the page and its field in a violation of the field', async () => {
    expect(await violations(misplacedPage)).toEqual([
      {
        entityType: 'node',
        entityUuid: MISPLACED_PAGE,
        propertyPath: 'field_paragraphs.0.target_id',
      },
    ])
  })

  it("lists the field's violation with its label", async () => {
    await openPublishDialog(misplacedPage)
    await dialogSubmit(misplacedPage).click()
    const items = misplacedPage.locator('[data-test="publish-violation-item"]')
    await items.first().waitFor({ state: 'visible' })
    expect(await items.count()).toBe(1)

    const label = await withApp(
      misplacedPage,
      (app) =>
        app.types.getFieldConfig('node', 'page', 'field_paragraphs')?.label,
    )
    expect(label).toBeTruthy()
    const field = items.first().locator('[data-test="publish-violation-field"]')
    expect(await field.count()).toBe(1)
    expect((await field.textContent())?.trim()).toBe(label)
  })

  it("isn't published for an editor", async () => {
    await openPublishDialog(page)
    await dialogSubmit(page).click()
    const items = page.locator('[data-test="publish-violation-item"]')
    await items.first().waitFor({ state: 'visible' })
    expect(await items.count()).toBe(1)
  })

  // Last two: they fix the page.
  it('drops the violation once the misplaced paragraph is gone', async () => {
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
