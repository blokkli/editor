import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { emitEvent } from '../../support/events'
import { blockOption } from '../../support/options'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, withApp } from '../../support/session'

/**
 * The options of a page are a field. A user who may not edit it can't change
 * them: Drupal refuses the change (`UpdateHostOptions`), so the editor offers
 * none. An option outside a group isn't rendered then.
 *
 * The test module blokkli_playground_test locks the editorial pages' options
 * for Tim's role. Anna, an editor, may change them: her page is the control.
 *
 * Page lifecycle: Tim on the editorial page "Field access options", Anna on
 * the editorial page "Blank", opened in parallel. Nothing is changed.
 */
describe('Read-only options of the page', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let controlPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, controlPage] = await Promise.all([
      openEditor(
        sandbox,
        'Tim Fischer',
        editorPath('/en/field-access-options', 'field-access-options'),
      ),
      openEditor(sandbox, 'Anna Keller', editorPath('/en/blank', 'blank')),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), controlPage.close()])
  })

  test('can not be changed', async () => {
    await emitEvent(controlPage, 'select:host')
    await blockOption(controlPage, 'header').waitFor({ state: 'visible' })

    await emitEvent(page, 'select:host')
    await expect
      .poll(() => withApp(page, (app) => app.selection.hasHostSelected.value))
      .toBe(true)
    await page.waitForTimeout(300)
    expect(await blockOption(page, 'header').count()).toBe(0)
  })
})
