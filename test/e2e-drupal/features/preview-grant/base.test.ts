import { createPage, setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addBlock } from '../../support/blocks'
import { installCspCheck } from '../../support/csp'
import { askDrupal, type DrupalAnswer } from '../../support/drupal'
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

/**
 * The pending changes of a page: what a preview shows. The editor's history
 * shows them at an index of its own.
 */
const EDIT_STATE = `query ($uuid: String!, $historyIndex: Int) {
  state: getParagraphsEditState(
    entityType: NODE
    entityUuid: $uuid
    langcode: "en"
    historyIndex: $historyIndex
  ) {
    mutatedState {
      fields(langcode: "en") {
        name
        list {
          uuid
        }
      }
    }
  }
}`

/** Who changed the page, and how: an edit state has it for the editor. */
const HISTORY = `query ($uuid: String!) {
  state: getParagraphsEditState(
    entityType: NODE
    entityUuid: $uuid
    langcode: "en"
  ) {
    ownerName
    owner: uidRawField { first { targetId } }
    currentIndex
    mutations { pluginId }
    history: mutationsRawField { count }
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

/**
 * What only the editor may change: a machine translation, which costs the
 * site's quota at the provider, and the notifications.
 */
const EDITOR_MUTATIONS = `mutation {
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
  read: pbMarkNotificationsAsRead
}`

type EditStateAnswer = {
  mutatedState: { fields: { list: { uuid: string }[] }[] }
} | null

/** The UUIDs of the paragraphs in an answer to EDIT_STATE. */
function paragraphUuids(answer: DrupalAnswer): string[] {
  const state = answer.data?.state as EditStateAnswer | undefined
  return (state?.mutatedState.fields ?? []).flatMap((field) =>
    field.list.map((paragraph) => paragraph.uuid),
  )
}

/** Whether the page renders the block. */
async function hasBlock(page: Page, uuid: string): Promise<boolean> {
  return (await page.locator(`[data-bk-uuid="${uuid}"]`).count()) === 1
}

/**
 * Waits until the second of a time is over. Drupal's times are in seconds: a
 * change within the same second as the state that a preview loaded doesn't
 * change the time.
 */
async function untilNextSecond(time: number): Promise<void> {
  const wait = Math.floor(time / 1000) * 1000 + 1000 - Date.now()
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
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
  /** When the visitor's preview had loaded. */
  let loadedAt: number

  /** Lets the preview's requests for the time of the last change through. */
  let releasePolls = () => {}
  const polls = new Promise<void>((resolve) => {
    releasePolls = resolve
  })

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
    await installCspCheck(visitor)
    // The preview asks when the page was last changed, a second after it has
    // loaded and then every second. It gets no answer until a test lets it.
    await visitor.route('**/last_changed', async (route) => {
      await polls
      await route.continue()
    })
    await visitor.goto(previewUrl)
    loadedAt = Date.now()
  })

  afterAll(async () => {
    releasePolls()
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
    // The change comes before the preview's first answer: the preview
    // compares that answer with the time of the state that it loaded.
    await untilNextSecond(loadedAt)
    const later = (await addBlock(anna))!
    releasePolls()
    await expect
      .poll(() => hasBlock(visitor, later), { timeout: 10000 })
      .toBe(true)
  })

  it('is for the changes of its page only', async () => {
    const own = await askDrupal(visitor, EDIT_STATE, { uuid: BLOCKS })
    expect(own.data?.state).toBeTruthy()

    const other = await askDrupal(visitor, EDIT_STATE, { uuid: NOTICES })
    expect(other.data).toEqual({ state: null })
  })

  it('does not say who changed the page, or how', async () => {
    // The editor's user gets it.
    const editor = await askDrupal(anna, HISTORY, { uuid: BLOCKS })
    expect(editor.data?.state).toMatchObject({
      ownerName: 'Anna Keller',
      currentIndex: 1,
      mutations: [{ pluginId: 'add' }, { pluginId: 'add' }],
      history: { count: 2 },
    })

    const answer = await askDrupal(visitor, HISTORY, { uuid: BLOCKS })
    expect(answer.data).toEqual({
      state: {
        ownerName: null,
        owner: null,
        currentIndex: null,
        mutations: [],
        history: null,
      },
    })
  })

  it('shows the page as it is, not as it was before', async () => {
    // The history index -1 is the page without the changes. An index above
    // the current one would show the changes that were undone.
    const variables = { uuid: BLOCKS, historyIndex: -1 }
    const editor = paragraphUuids(await askDrupal(anna, EDIT_STATE, variables))
    expect(editor).toContain(seedUuid('paragraph', 'first-title'))
    expect(editor).not.toContain(added)

    const visitorUuids = paragraphUuids(
      await askDrupal(visitor, EDIT_STATE, variables),
    )
    expect(visitorUuids).toContain(added)
  })

  it('gets nothing else of the editor from Drupal', async () => {
    const answer = await askDrupal(visitor, EDITOR_ONLY, { uuid: BLOCKS })
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

  it('can not request a machine translation, or mark notifications', async () => {
    // Refused without an error: Drupal would log one.
    const answer = await askDrupal(visitor, EDITOR_MUTATIONS)
    expect(answer).toEqual({ data: { translation: null, read: null } })
  })
})
