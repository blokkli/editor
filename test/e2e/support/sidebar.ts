import type { Page } from 'playwright-core'

/**
 * Open an editor sidebar pane by its `PluginSidebar` id (e.g. `test-cases`,
 * `analyze`). A sidebar only mounts its content while it's the active pane, so
 * anything that lives inside one — including the playground `test-cases`
 * feature that registers `window.__BLOKKLI__.test` — isn't available until its
 * sidebar is opened.
 */
export function openSidebar(page: Page, id: string): Promise<void> {
  return page.evaluate(
    (id) => window.__BLOKKLI__!.app!.eventBus.emit('sidebar:open', id),
    id,
  )
}
