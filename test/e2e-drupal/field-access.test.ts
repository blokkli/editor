import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from './support/session'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'

/**
 * Drupal lets a mutation write the fields that the form of the entity could
 * let the user edit. Anna Keller, an editor, may not administer nodes: the
 * page's title is hers to change, its author and whether it's published are
 * not.
 *
 * The editor offers no way to write such a field, so the specs call the
 * adapter, as a request made by hand would.
 */

/** Ask Drupal to set a field of the page, in a mutation of its own. */
function setPageField(page: Page, fieldName: string, fieldValue: string) {
  return page.evaluate(
    async ({ fieldName, fieldValue }) => {
      const result = await window.__BLOKKLI__!.app!.adapter
        .updateEntityFieldValue!({ fieldName, fieldValue })
      return { success: result?.success, errors: result?.errors ?? [] }
    },
    { fieldName, fieldValue },
  )
}

/** Ask Drupal to set a field of the page, as the batched text updates do. */
function setPageFieldBatched(
  page: Page,
  fieldName: string,
  fieldValue: string,
) {
  return page.evaluate(
    async ({ fieldName, fieldValue }) => {
      const result = await window.__BLOKKLI__!.app!.adapter
        .updateFieldValueBatched!({
        items: [],
        entityItems: [{ fieldName, fieldValue }],
      })
      return { success: result?.success, errors: result?.errors ?? [] }
    },
    { fieldName, fieldValue },
  )
}

describe('The fields a mutation may write', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  it("refuses the page's status, author and dates for an editor", async () => {
    for (const fieldName of ['status', 'uid', 'created', 'sticky']) {
      const denied = {
        success: false,
        errors: [`Access denied: cannot edit field '${fieldName}'.`],
      }
      expect(await setPageField(page, fieldName, '0')).toEqual(denied)
      expect(await setPageFieldBatched(page, fieldName, '0')).toEqual(denied)
    }
  })

  it('refuses what makes up the page', async () => {
    for (const fieldName of ['nid', 'type', 'langcode', 'field_paragraphs']) {
      expect(await setPageField(page, fieldName, '1')).toEqual({
        success: false,
        errors: [`Field '${fieldName}' can't be edited.`],
      })
    }
  })

  // Last: it changes the page.
  it("changes the page's title", async () => {
    expect(await setPageField(page, 'title', 'A new title')).toEqual({
      success: true,
      errors: [],
    })

    // Nothing of the refused mutations is stored.
    await page.reload()
    expect(await withApp(page, (app) => app.state.mutations.value.length)).toBe(
      1,
    )
  })
})
