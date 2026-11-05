import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openTranslateDialog } from '../../support/translations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The page "Field access" (content/nodes/field-access.yml), whose aside, right
// column and widget's title Tim may not edit.
const ASIDE_TITLE = seedUuid('paragraph', 'field-access-aside-title')
const LEFT = seedUuid('paragraph', 'field-access-left')
const RIGHT = seedUuid('paragraph', 'field-access-right')
const WIDGET = seedUuid('paragraph', 'field-access-widget')

/** The translate dialog's row for a given `uuid:fieldName` key. */
function batchRow(page: Page, key: string): Locator {
  return page.locator(
    `[data-test="translations-batch-row"][data-test-key="${key}"]`,
  )
}

/**
 * The translate dialog offers only the fields that the user may change. Drupal
 * refuses a translation of a field that the user may not edit, and of any
 * field of a paragraph in a paragraphs field that they may not edit; one
 * refused value fails the whole batch.
 *
 * The test module blokkli_playground_test locks the fields for Tim's role
 * (`FieldAccessHooks`). The title on the left is the control.
 *
 * Page lifecycle: Tim on the page "Field access", opened directly in German
 * (translating). Nothing is changed.
 */
describe('Read-only fields: translating', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Tim Fischer',
      editorPath('/de/field-access', 'field-access'),
    )
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test('the translate dialog leaves out the fields the user may not change', async () => {
    await openTranslateDialog(page)

    await batchRow(page, `${LEFT}:field_title`).waitFor({ state: 'visible' })
    // A read-only text field.
    expect(await batchRow(page, `${WIDGET}:field_title`).count()).toBe(0)
    // The fields of the blocks in read-only paragraphs fields.
    expect(await batchRow(page, `${ASIDE_TITLE}:field_title`).count()).toBe(0)
    expect(await batchRow(page, `${RIGHT}:field_text`).count()).toBe(0)
  })
})
