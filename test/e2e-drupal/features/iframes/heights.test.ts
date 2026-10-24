import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import type { IframeHeightMap } from '#blokkli/iframes/types'
import { editorPath, openEditor } from '../../support/session'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

const UUID = seedUuid('paragraph', 'embeds-calculator')

/** The height the slot should have for the wrapper's width. */
function expectedHeight(heights: IframeHeightMap, width: number): number {
  const entries = Object.entries(heights)
    .map(([w, h]) => ({ width: Number(w), height: h }))
    .sort((a, b) => a.width - b.width)
  return (entries.find((e) => width <= e.width) ?? entries[entries.length - 1]!)
    .height
}

function measure(page: Page) {
  return page.locator(`[data-bk-iframe-id="${UUID}"]`).evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.firstElementChild!.getBoundingClientRect().height,
  }))
}

/**
 * `<BlokkliIframe>` gives its slot the height for its container's width, from
 * the block's height map: 600px up to 375px, 500px up to 768px, 400px above
 * (content/nodes/embeds.yml). The rules are a constructable stylesheet in the
 * browser, so the build's Content-Security-Policy doesn't refuse them.
 */
describe('The heights of an embed', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/embeds', 'embeds'),
    )
    await page.locator(`[data-bk-iframe-id="${UUID}"]`).waitFor()
  })

  afterAll(async () => {
    await page.close()
  })

  test("the frame's slot gets the height for its width", async () => {
    const size = await measure(page)
    const heights = { 375: 600, 768: 500, 1440: 400 }
    expect(size.height).toBe(expectedHeight(heights, size.width))
  })

  test('the slot follows a change of the heights', async () => {
    const heights = { 375: 650, 768: 550, 1440: 450 }
    await page.evaluate(
      async ({ uuid, value }) => {
        const app = window.__BLOKKLI__!.app!
        await app.state.mutateWithLoadingState(() =>
          app.adapter.updateOptions!([{ uuid, key: 'heights', value }]),
        )
      },
      { uuid: UUID, value: JSON.stringify(heights) },
    )

    await expect
      .poll(async () => {
        const size = await measure(page)
        return size.height === expectedHeight(heights, size.width)
      })
      .toBe(true)
  })
})
