import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { openItemDropdown } from '../../support/itemActions'
import { closeNestedEditor, nestedEditorOverlay } from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/** The link to a document on the page "Downloads". */
const DOCUMENT_LINK = seedUuid('paragraph', 'downloads-document')

/** The teaser of the page "Reading", which links to the page "Blocks". */
const TEASER = seedUuid('paragraph', 'reading-teaser')

/**
 * The referenced entities feature (`features/referenced-entities/index.vue`)
 * lists what the selected blocks reference or link to, in the dropdown of the
 * block's actions. An entry opens the entity's form in an overlay.
 *
 * Drupal lists the entities that the user may view, and gives the URL of the
 * form only for the ones that the user may edit. An entry without it shows
 * what the block references, but can't be opened.
 *
 * Page lifecycle: two editor pages for Anna Keller, opened in parallel. On the
 * page "Downloads" a link points to a document, which an editor may view but
 * not edit. On the page "Reading" a teaser links to a page, which she may
 * edit. No test changes anything; `afterEach` deselects on both pages.
 */
describe('The referenced entities feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let downloads: Page
  let reading: Page

  /** The entries of the list in the dropdown of the selected block. */
  async function openList(page: Page, uuid: string): Promise<Locator> {
    await selectBlock(page, uuid)
    await openItemDropdown(page)
    const entries = page.locator('[data-test="referenced-entity"]')
    await entries.first().waitFor({ state: 'visible' })
    return entries
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[downloads, reading] = await Promise.all([
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/en/downloads', 'downloads'),
      ),
      openEditor(sandbox, 'Anna Keller', editorPath('/en/reading', 'reading')),
    ])
  })

  afterAll(async () => {
    await Promise.all([downloads.close(), reading.close()])
  })

  afterEach(async () => {
    await Promise.all([
      emitEvent(downloads, 'select:unselect'),
      emitEvent(reading, 'select:unselect'),
    ])
  })

  test('an entity that the user may not edit is listed, but does not open', async () => {
    const entries = await openList(downloads, DOCUMENT_LINK)

    expect(await entries.count()).toBe(1)
    const entry = entries.first()
    expect(await entry.getAttribute('data-test-entity-type')).toBe('media')
    expect(await entry.getAttribute('data-test-editable')).toBe('false')
    expect(await entry.getAttribute('href')).toBeNull()

    await entry.click()
    expect(
      await nestedEditorOverlay(downloads, 'referenced-entity').count(),
    ).toBe(0)
  })

  test('an entity that the user may edit opens its form', async () => {
    const entries = await openList(reading, TEASER)

    expect(await entries.count()).toBe(1)
    const entry = entries.first()
    expect(await entry.getAttribute('data-test-entity-type')).toBe('node')
    expect(await entry.getAttribute('data-test-editable')).toBe('true')
    expect(await entry.getAttribute('href')).toContain('/edit')

    await entry.click()
    await nestedEditorOverlay(reading, 'referenced-entity').waitFor({
      state: 'visible',
    })
    await closeNestedEditor(reading, 'referenced-entity')
    await nestedEditorOverlay(reading, 'referenced-entity').waitFor({
      state: 'detached',
    })
  })
})
