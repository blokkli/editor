import type { Page } from 'playwright-core'
import { withApp } from './session'

// Read the editor's block selection state (the `selection` provider).

/** The uuids of the currently selected blocks, in selection order. */
export function selectedUuids(page: Page): Promise<string[]> {
  return withApp(page, (app) => [...app.selection.uuids.value])
}

/** The uuids of all top-level (non-nested) blocks, in document order. */
export function topLevelBlockUuids(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.blocks
      .getAllBlocks()
      .filter((block) => !block.isNested)
      .map((block) => block.uuid),
  )
}
