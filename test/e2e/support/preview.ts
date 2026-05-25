import type { Frame, Page } from 'playwright-core'

const PREVIEW_IFRAME = '[data-test="preview-iframe"]'

/**
 * The responsive-preview iframe's content frame, ready for inspection.
 *
 * Waits until the preview app has **hydrated**: `PreviewProvider` registers its
 * `postMessage` sync listeners on mount (after the SSR markup is already
 * present), so editor events relayed to the iframe before that — option
 * updates, preview-state updates, focus — are silently dropped. Gate on
 * hydration so a freshly-emitted change actually reaches the preview.
 *
 * Note: inside the iframe there is no `window.__BLOKKLI__` (preview mode);
 * blocks are identified by `[data-bk-uuid]` (the runtime's own block id).
 */
export async function getPreviewFrame(page: Page): Promise<Frame> {
  await page.locator(PREVIEW_IFRAME).waitFor({ state: 'attached' })
  const handle = await page.locator(PREVIEW_IFRAME).elementHandle()
  const frame = await handle?.contentFrame()
  if (!frame) {
    throw new Error('Preview iframe has no content frame')
  }
  await frame.waitForFunction(() => {
    const nuxt = (
      window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }
    ).useNuxtApp
    return nuxt ? nuxt().isHydrating === false : false
  })
  return frame
}
