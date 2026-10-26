import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../support/sidebar'
import { runAgentTool } from '../../../support/agent'
import { nextMutation } from '../../../support/mutations'
import { mediaLibraryItem, searchContentItem } from '../../../support/dropAreas'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'
import {
  editorPath,
  openEditor,
  revertAllChanges,
} from '../../../support/session'

// The translated teaser of the news "Drops" (content/nodes/drops.yml), whose
// link and media differ per language in E2E sandboxes.
const TEASER = seedUuid('paragraph', 'drops-teaser')

/**
 * The agent's replace tools change the edited language only, unless they're
 * asked to change every language (`allLanguages`).
 */
describe('agent: replacing in all languages', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/news/drops', 'drops'),
    )
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await revertAllChanges(page)
  })

  test('replace_media_field', async () => {
    const hills = await mediaLibraryItem(page, 'The hills')
    if (hills.itemType !== 'media_library') {
      throw new Error('Not a media.')
    }
    const params = {
      uuid: TEASER,
      field: 'field_media',
      mediaId: hills.mediaId,
      mediaBundle: hills.mediaBundle,
    }

    let variables = nextMutation(page, 'pbReplaceMedia')
    await runAgentTool(page, 'replace_media_field', {
      ...params,
      allLanguages: true,
    })
    expect(await variables).toMatchObject({ allLanguages: true })

    variables = nextMutation(page, 'pbReplaceMedia')
    await runAgentTool(page, 'replace_media_field', params)
    expect((await variables).allLanguages).toBeUndefined()
  })

  test('replace_content_search_item', async () => {
    const links = await searchContentItem(page, 'Links')
    if (links.itemType !== 'search_content') {
      throw new Error('Not a search result.')
    }
    const variables = nextMutation(page, 'pbReplaceEntityReference')
    await runAgentTool(page, 'replace_content_search_item', {
      uuid: TEASER,
      field: 'field_link',
      itemId: links.searchItem.id,
      itemEntityType: links.searchItem.entityType,
      itemEntityBundle: links.searchItem.entityBundle,
      allLanguages: true,
    })
    expect(await variables).toMatchObject({
      uuid: TEASER,
      fieldName: 'field_link',
      allLanguages: true,
    })
  })
})
