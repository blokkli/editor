import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { MIN_RECT_SIZE } from '../../../../src/runtime/editor/helpers/geometry'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/**
 * The editor keeps the rectangle of every rendered block: the canvas finds the
 * block under the pointer by them and draws the outlines on them. A rectangle
 * is at least MIN_RECT_SIZE wide and tall, so that a block that renders little
 * or nothing can still be pointed at.
 *
 * On the front page (content/nodes/home.yml), which starts with a text.
 */

const HOME_EDITOR_PATH = editorPath('/en', 'home')
const TEXT = seedUuid('paragraph', 'home-text')

describe('Block rectangles', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', HOME_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  test('a block that shrinks below the minimum keeps a rectangle of the minimum size', async () => {
    const height = await page.evaluate(async (uuid) => {
      const app = window.__BLOKKLI__!.app!
      const el = app.dom.registeredBlocks.value[uuid]!
      const frame = () =>
        new Promise((resolve) => requestAnimationFrame(resolve))
      // As if its content got smaller: the ResizeObserver reports the size.
      el.style.height = '10px'
      el.style.overflow = 'hidden'
      await frame()
      await frame()
      const height = app.dom.getBlockRect(uuid)?.height
      el.style.height = ''
      el.style.overflow = ''
      return height
    }, TEXT)

    expect(height).toBe(MIN_RECT_SIZE)
  })
})
