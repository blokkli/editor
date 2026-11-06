import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { storedFieldValue } from '../../support/editable'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor, withApp } from '../../support/session'

// Two texts in English, German and French (content/templates.yml).
const TEMPLATE = seedUuid('blokkli_paragraph_template', 'translated-texts')

/** The texts of the paragraphs, sorted. */
async function texts(page: Page, uuids: string[]): Promise<string[]> {
  const values = await Promise.all(
    uuids.map((uuid) => storedFieldValue(page, uuid, 'field_text')),
  )
  return values.map((v) => v ?? '').sort()
}

/**
 * Adding a template whose paragraphs have translations to a page with
 * translations.
 *
 * Page lifecycle: Anna opens the page "Library" (content/nodes/translated.yml)
 * in English; the test opens its German translation in a page of its own.
 */
describe('Adding a translated template', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/library', 'translated'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test("The page's translations get the template's", async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    // As the dialog "Template" adds it, at the start of the page.
    await page.evaluate(async (templateUuid) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.templatesAdd!({
          templateUuid,
          host: {
            type: app.context.value.entityType,
            uuid: app.context.value.entityUuid,
            fieldName: 'field_paragraphs',
          },
          afterUuid: null,
        }),
      )
    }, TEMPLATE)
    const added = (
      await withApp(page, (app) => app.state.getAllUuids())
    ).filter((uuid) => !before.includes(uuid))
    expect(added).toHaveLength(2)
    expect(await texts(page, added)).toEqual([
      '<p>The first translated text.</p>',
      '<p>The second translated text.</p>',
    ])

    const germanPage = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/bibliothek', 'translated'),
    )
    try {
      expect(await texts(germanPage, added)).toEqual([
        '<p>Der erste übersetzte Text.</p>',
        '<p>Der zweite übersetzte Text.</p>',
      ])
    } finally {
      await germanPage.close()
    }
  })
})
