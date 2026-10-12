import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appMenuButton, closeAppMenu, openAppMenu } from '../../support/menu'
import { dialog } from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor, withApp } from '../../support/session'
import { toolbarButton } from '../../support/toolbar'

/** An unpublished page (content/nodes/draft.yml). */
const DRAFT = seedUuid('node', 'draft')

/** The UUIDs of the entities that Drupal lists for the page's user. */
function listedUuids(page: Page): Promise<string[]> {
  return withApp(page, async (app) => {
    const result = await app.adapter.getHostEntities!()
    return result.items.map((item) => item.uuid)
  })
}

/**
 * The list of all pages ("Switch page", and "Import from an existing page")
 * has every entity that is edited with blökkli, also the ones that its user
 * may not view. Drupal gives it to the roles with the permission "view any
 * blokkli entity label".
 *
 * Anna Keller, an editor, has it. Sara Gerber reviews without it: her editor
 * has neither feature, and Drupal answers her request with nothing.
 *
 * Page lifecycle: one editor page per user on the page "Blocks", opened in
 * parallel. Nothing is stored.
 */
describe('The list of all pages', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let anna: Page
  let sara: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[anna, sara] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH),
      openEditor(sandbox, 'Sara Gerber', BLOCKS_EDITOR_PATH),
    ])
  })

  afterAll(async () => {
    await Promise.all([anna.close(), sara.close()])
  })

  it('lets a role with the permission switch pages', async () => {
    await toolbarButton(anna, 'workspace').click()
    const items = anna.locator('[data-test="workspace-item"]')
    await items.first().waitFor()
    expect(await items.count()).toBeGreaterThan(1)

    await anna.keyboard.press('Escape')
    await items.first().waitFor({ state: 'detached' })

    // Every page, the unpublished one too.
    expect(await listedUuids(anna)).toContain(DRAFT)
  })

  it('lets a role with the permission import from a page', async () => {
    await openAppMenu(anna)
    await appMenuButton(anna, 'import_existing').click()
    const importDialog = dialog(anna, 'import-existing')
    await importDialog.waitFor({ state: 'visible' })

    const items = importDialog.locator('[data-test="import-existing-item"]')
    await items.first().waitFor()
    // The pages of the same type, without the page itself.
    const uuids = await items.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-test-uuid')),
    )
    expect(uuids.length).toBeGreaterThan(1)
    expect(uuids).not.toContain(seedUuid('node', 'blocks'))

    await importDialog.locator('[data-test="dialog-cancel"]').click()
    await importDialog.waitFor({ state: 'hidden' })
  })

  it('has neither feature for a role without the permission', async () => {
    expect(await toolbarButton(sara, 'workspace').count()).toBe(0)

    await openAppMenu(sara)
    expect(await appMenuButton(sara, 'import_existing').count()).toBe(0)
    // The menu itself is there.
    expect(await appMenuButton(sara, 'exit').count()).toBe(1)
    await closeAppMenu(sara)
  })

  it('gets nothing from Drupal without the permission', async () => {
    expect(await listedUuids(sara)).toEqual([])
  })
})
