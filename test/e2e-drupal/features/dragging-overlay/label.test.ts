import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { BLOCKS_EDITOR_PATH, openEditor, withApp } from '../../support/session'
import { emitEvent } from '../../support/events'
import { nextFrames } from '../../support/blocks'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

const LABEL = '[data-test="dragging-overlay-label"]'

/**
 * The label of the drop target under the pointer names where a drop puts the
 * block: the page, then the blocks and fields on the way. Its parts hold
 * content (the page's label, the blocks' titles), so they're rendered as text.
 *
 * The block is the second of the page "Blocks" (content/nodes/blocks.yml).
 */
describe('The drop target label', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    await emitEvent(page, 'select:unselect')
  })

  test('names the page and the field as text', async () => {
    const uuid = seedUuid('paragraph', 'first-text')

    // Start the drag. Once the overlay is there (its label is hidden while no
    // target is active), put the start of the page's field under the
    // viewport's centre and move the pointer there.
    await page.evaluate((uuid) => {
      const app = window.__BLOKKLI__!.app!
      const block = app.blocks.getBlock(uuid)!
      app.eventBus.emit('dragging:start', {
        items: [{ itemType: 'existing', block }],
        coords: { x: 10, y: 10 },
        mode: 'mouse',
      })
    }, uuid)
    await page.locator(LABEL).waitFor({ state: 'attached' })
    const center = await page.evaluate(() => {
      const app = window.__BLOKKLI__!.app!
      app.eventBus.emit('dragging:moveToDropTarget', {
        host: app.context.value.entityUuid,
        fieldName: 'field_paragraphs',
      })
      const v = app.ui.viewport.value
      return { x: Math.round(v.width / 2), y: Math.round(v.height / 2) }
    })
    await nextFrames(page)
    await page.mouse.move(center.x, center.y, { steps: 12 })
    await page.locator(LABEL).waitFor()

    const label = await page.evaluate((selector) => {
      const app = window.__BLOKKLI__!.app!
      const entity = app.state.entity.value
      const field = app.types.getFieldConfig(
        app.context.value.entityType,
        app.context.value.entityBundle,
        'field_paragraphs',
      )
      const element = document.querySelector(selector)!
      return {
        text: element.textContent!.trim(),
        types: Array.from(
          element.querySelectorAll('[data-test="dragging-overlay-label-part"]'),
        ).map((part) => part.getAttribute('data-test-type')),
        expected: `${entity.bundleLabel || entity.label} » ${field?.label}`,
      }
    }, LABEL)
    expect(label.types).toEqual(['host', 'field'])
    expect(label.text).toBe(label.expected)
  })
})
