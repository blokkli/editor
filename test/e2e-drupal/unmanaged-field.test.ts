import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { blockExists } from './support/blocks'
import { getPreviewFrame } from './support/preview'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from './support/sandbox'
import { openSidebar } from './support/sidebar'
import { editorPath, openEditor, withApp } from './support/session'

/**
 * With "Restrict paragraph fields", blökkli manages only some paragraphs fields
 * of a bundle. In E2E sandboxes it doesn't manage the related topics of a
 * detail page: the field config says that the editor can't edit them.
 *
 * The edit state doesn't have their paragraphs, so the editor shows them as
 * the page gives them, and they're no place to drop: the field isn't
 * registered, and its paragraph is no block of the editor.
 *
 * On the page "Unmanaged" (content/nodes/unmanaged.yml): a text, and a related
 * topic.
 */

const TEASER = seedUuid('paragraph', 'unmanaged-teaser')

describe("A field that the editor can't edit", async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/unmanaged', 'unmanaged'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  it('shows what it holds, without a place to drop', async () => {
    await expect
      .poll(() => page.locator('[data-test="related-topic"]').count())
      .toBe(1)
    expect(await blockExists(page, TEASER)).toBe(false)
    expect(
      await withApp(page, (app) => {
        const uuid = app.context.value.entityUuid
        return {
          related: !!app.dom.getRegisteredField(uuid, 'field_related'),
          paragraphs: !!app.dom.getRegisteredField(uuid, 'field_paragraphs'),
        }
      }),
    ).toEqual({ related: false, paragraphs: true })
  })

  it('shows what it holds in the preview', async () => {
    await openSidebar(page, 'mobile-preview')
    const frame = await getPreviewFrame(page)
    await frame
      .locator(`[data-bk-uuid="${TEASER}"]`)
      .waitFor({ state: 'attached' })
  })
})
