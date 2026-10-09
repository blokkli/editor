import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { setupEditorE2E } from '../../support/setup'
import { captureClipboard, copiedText } from '../../support/clipboard'
import { openViewOptions, viewOption } from '../../support/toolbar'

/**
 * The anchors feature's fallback link: without `adapter.buildAnchorLink`,
 * clicking an indicator copies `route.path + '#' + id`. The Drupal adapter
 * always has `buildAnchorLink`, so this one stays with the mock; the rest of
 * the feature runs against Drupal (`test/e2e-drupal/features/anchors`).
 *
 * The playground's `two_columns` block renders its root `<div :id="anchorId">`
 * (option `anchorId`, type `text`). The indicator sits to the LEFT of its
 * block, possibly off-screen, so the test dispatches a `click` event; that
 * event is untrusted, so `clipboard.writeText` rejects silently and we wrap it
 * to capture what the feature copies.
 */

const ANCHOR = 'my-section'

describe('The anchors feature', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
    await captureClipboard(page)
  })

  afterAll(async () => {
    await page.close()
  })

  test('clicking the indicator copies the fallback anchor link', async () => {
    const uuid = await page.evaluate(async (anchor) => {
      const app = window.__BLOKKLI__!.app!
      const before = new Set(app.state.getAllUuids())
      await app.state.mutateWithLoadingState(() =>
        app.adapter.addNewBlock({
          bundle: 'two_columns',
          host: {
            type: app.context.value.entityType,
            uuid: app.context.value.entityUuid,
            fieldName: 'content',
          },
          afterUuid: null,
        }),
      )
      const uuid = app.state.getAllUuids().find((u) => !before.has(u))!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.updateOptions!([{ uuid, key: 'anchorId', value: anchor }]),
      )
      return uuid
    }, ANCHOR)

    // The overlay scans on mount: wait for the anchored element first.
    await page.waitForFunction(
      (id) => Boolean(document.getElementById(id)),
      ANCHOR,
    )
    await openViewOptions(page)
    // The option defaults to ON and its state persists: only click when off.
    if (
      (await viewOption(page, 'anchor').getAttribute('data-test-active')) !==
      'true'
    ) {
      await viewOption(page, 'anchor').click()
    }

    const indicator = page.locator(
      `[data-test-block-indicator="anchor"][data-test-uuid="${uuid}"]`,
    )
    await indicator.waitFor({ state: 'attached' })
    await indicator.dispatchEvent('click')

    const pathname = await page.evaluate(() => location.pathname)
    await expect.poll(() => copiedText(page)).toContain(`${pathname}#${ANCHOR}`)
  })
})
