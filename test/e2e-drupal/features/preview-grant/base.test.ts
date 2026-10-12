import { createPage, setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addBlock } from '../../support/blocks'
import { dialog } from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  BLOCKS_EDITOR_PATH,
  claimEditState,
  editorPath,
  openEditor,
} from '../../support/session'
import { toolbarButton } from '../../support/toolbar'

const BLOCKS = seedUuid('node', 'blocks')
const NOTICES = seedUuid('node', 'notices')

/** The pending changes of a page: what a preview shows. */
const EDIT_STATE = `query ($uuid: String!) {
  state: getParagraphsEditState(
    entityType: NODE
    entityUuid: $uuid
    langcode: "en"
  ) {
    mutatedState {
      fields(langcode: "en") {
        name
      }
    }
  }
}`

/** What the editor asks Drupal for, and a preview has no use for. */
const EDITOR_ONLY = `query ($uuid: String!) {
  types: pbGetParagraphTypes { id }
  fields: pbGetFieldConfig { name }
  allowedTypes: paragraphsBlokkliAllowedTypes { __typename }
  entityTypes: paragraphsBlokkliEntityTypeConfig { entityTypeId }
  conversions: paragraphsBlokkliConversions { __typename }
  features: paragraphsBlokkliAvailableFeatures { mutations }
  clipboards: pbGetSupportedClipboards { __typename }
  entityConfig: pbGetEntityConfig(entityType: "node", entityUuid: $uuid) {
    linkPath
  }
  media: pbMediaLibraryGetResults { total }
  searchTabs: paragraphsBlokkliSearchTabs { id }
  templates: paragraphsBlokkliTemplateSearch { total }
  transforms: paragraphsBlokkliGetTransformPlugins(
    entityType: NODE
    entityUuid: $uuid
    langcode: "en"
  ) {
    id
  }
}`

/** A machine translation: it costs the site's quota at the provider. */
const TRANSLATE = `mutation {
  translation: paragraphsBlokkliRequestTranslation(
    items: [
      {
        key: "a"
        text: "Hello"
        sourceLanguage: "en"
        targetLanguage: "de"
        isMarkup: false
      }
    ]
  ) {
    success
  }
}`

type Answer = {
  data?: Record<string, unknown> | null
  errors?: { path?: string[] }[]
}

/** Asks Drupal directly, as the page's visitor. */
function ask(
  page: Page,
  query: string,
  variables: Record<string, string> = {},
): Promise<Answer> {
  return page.evaluate(
    async (body) => {
      const response = await fetch('/en/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return response.json()
    },
    { query, variables },
  )
}

/** Whether the page renders the block. */
async function hasBlock(page: Page, uuid: string): Promise<boolean> {
  return (await page.locator(`[data-bk-uuid="${uuid}"]`).count()) === 1
}

/**
 * "Preview (with smartphone)" gives a link that shows the page with its
 * pending changes to whoever opens it: a visitor without an account. The link
 * is for that page's changes, and for nothing else of the editor.
 *
 * Anna Keller changes the page "Blocks" and takes its link; Lea Steiner has
 * changes on the page "Notices". The visitor opens Anna's link in a browser of
 * their own.
 *
 * Page lifecycle: Anna's editor and the visitor's preview, both on the page
 * "Blocks". Anna's changes are never published.
 */
describe('The preview link', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let anna: Page
  let visitor: Page
  let added: string

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[anna] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH),
      claimEditState(
        sandbox,
        'Lea Steiner',
        editorPath('/en/notices', 'notices'),
      ),
    ])
    added = (await addBlock(anna))!

    await toolbarButton(anna, 'preview_with_smartphone').click()
    const link = dialog(anna, 'preview-grant').locator(
      '[data-test="preview-grant-link"]',
    )
    await link.waitFor()
    const previewUrl = await link.inputValue()
    await dialog(anna, 'preview-grant')
      .locator('[data-test="dialog-cancel"]')
      .click()
    await dialog(anna, 'preview-grant').waitFor({ state: 'hidden' })

    // A page of its own has a browser context of its own: no session.
    visitor = await createPage(undefined, { ignoreHTTPSErrors: true })
    await visitor.goto(previewUrl)
  })

  afterAll(async () => {
    await Promise.all([anna.close(), visitor.close()])
  })

  it('shows the pending changes to a visitor without an account', async () => {
    expect(new URL(visitor.url()).searchParams.get('blokkliPreview')).toBe(
      BLOCKS,
    )
    await visitor.locator(`[data-bk-uuid="${added}"]`).waitFor()
    expect(await hasBlock(visitor, seedUuid('paragraph', 'first-title'))).toBe(
      true,
    )
  })

  it('follows the changes that are made meanwhile', async () => {
    // The preview compares the time of the last change with what it got
    // from its request before: that one must have happened.
    await visitor.waitForResponse((response) =>
      response.url().includes('/last_changed'),
    )
    const later = (await addBlock(anna))!
    // It asks every second.
    await expect
      .poll(() => hasBlock(visitor, later), { timeout: 10000 })
      .toBe(true)
  })

  it('is for the changes of its page only', async () => {
    const own = await ask(visitor, EDIT_STATE, { uuid: BLOCKS })
    expect(own.data?.state).toBeTruthy()

    const other = await ask(visitor, EDIT_STATE, { uuid: NOTICES })
    expect(other.data).toEqual({ state: null })
  })

  it('gets nothing else of the editor from Drupal', async () => {
    const answer = await ask(visitor, EDITOR_ONLY, { uuid: BLOCKS })
    expect(answer.data).toEqual({
      types: null,
      fields: null,
      allowedTypes: null,
      entityTypes: null,
      conversions: null,
      features: null,
      clipboards: null,
      entityConfig: null,
      media: null,
      searchTabs: null,
      templates: null,
      transforms: null,
    })
  })

  it('can not request a machine translation', async () => {
    // The mutation's result can't be null: Drupal answers with an error, and
    // without data.
    const answer = await ask(visitor, TRANSLATE)
    expect(answer.data ?? null).toBeNull()
    expect(answer.errors?.map((error) => error.path)).toEqual([['translation']])
  })
})
