import type { Page } from 'playwright-core'
import { withApp } from './session'

/**
 * Press an editor keyboard shortcut. The keyboard provider only dispatches
 * shortcuts while the canvas is focused, so focus it first (same gate as
 * `support/clipboard.ts`), then press the key combo.
 *
 * `keys` is a Playwright key string, e.g. `'Delete'` or `'ControlOrMeta+d'`.
 */
export async function pressShortcut(page: Page, keys: string): Promise<void> {
  await withApp(page, (app) => app.ui.setCanvasFocused(true))
  await page.keyboard.press(keys)
}
