import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { editorPath, openEditor, withApp } from '../../support/session'
import { emitEvent } from '../../support/events'
import { openSidebar } from '../../support/sidebar'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

const COPY = '[data-test="dragging-overlay-copy"]'

/**
 * Starts a drag of the block from the page or from the structure sidebar. The
 * items hold the block and a function, so they're built in the page.
 */
function startDrag(page: Page, uuid: string, from: 'page' | 'structure') {
  return page.evaluate(
    ({ uuid, from }) => {
      const app = window.__BLOKKLI__!.app!
      const block = app.blocks.getBlock(uuid)!
      const element = document.querySelector<HTMLElement>(
        `[data-test="structure-item"][data-test-uuid="${uuid}"]`,
      )!
      app.eventBus.emit('dragging:start', {
        items: [
          from === 'page'
            ? { itemType: 'existing', block }
            : { itemType: 'existing_structure', block, element: () => element },
        ],
        coords: { x: 10, y: 10 },
        mode: 'mouse',
      })
    },
    { uuid, from },
  )
}

async function endDrag(page: Page) {
  if (await withApp(page, (app) => app.selection.isDragging.value)) {
    await emitEvent(page, 'dragging:end')
  }
  await page.locator(COPY).waitFor({ state: 'detached' })
  await emitEvent(page, 'select:unselect')
}

/**
 * The drag overlay shows a copy of what's dragged: the block, or the item of
 * the structure sidebar. The copy is outside the element's ancestors, so it
 * gets the element's computed styles, set on the elements: a strict
 * Content-Security-Policy (style-src 'self') refuses style attributes in
 * markup, and the build's policy reports them (support/csp.ts).
 *
 * The widget (content/nodes/widgets.yml) sets its title's colour as a style.
 * The page "Nested" (content/nodes/nested.yml) has texts in columns, the page
 * "Teasers" (content/nodes/teasers.yml) a teaser list without a title.
 */
describe('The copy in the drag overlay', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let nested: Page
  let teasers: Page
  const widget = seedUuid('paragraph', 'widgets-first')

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, nested, teasers] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', editorPath('/en/widgets', 'widgets')),
      openEditor(sandbox, 'Anna Keller', editorPath('/en/nested', 'nested')),
      openEditor(sandbox, 'Anna Keller', editorPath('/en/teasers', 'teasers')),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), nested.close(), teasers.close()])
  })

  afterEach(async () => {
    await Promise.all([endDrag(page), endDrag(nested), endDrag(teasers)])
  })

  test("keeps a block's style attributes", async () => {
    await startDrag(page, widget, 'page')
    await page.locator(COPY).waitFor()

    const colors = await page.evaluate(
      ({ uuid, copy }) => {
        const app = window.__BLOKKLI__!.app!
        const block = app.blocks.getBlock(uuid)!
        const title = '[data-test-text-color]'
        const original = app.dom
          .getDragElement(block)!
          .querySelector<HTMLElement>(title)!
        const copied = document.querySelector<HTMLElement>(`${copy} ${title}`)!
        return { original: original.style.color, copy: copied.style.color }
      },
      { uuid: widget, copy: COPY },
    )
    expect(colors.original).toBe('rgb(255, 255, 255)')
    expect(colors.copy).toBe(colors.original)
  })

  test('keeps the styles a block gets from its parent', async () => {
    const columns = seedUuid('paragraph', 'columns')
    const text = seedUuid('paragraph', 'columns-text-1')

    // A project's styles: one for a block inside another, as a teaser list
    // might style its teasers, and a pseudo-element from the block's own class.
    await nested.evaluate(
      ({ columns, text }) => {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(`
          [data-bk-uuid="${columns}"] [data-bk-uuid="${text}"] {
            color: rgb(200, 0, 0);
          }
          .rich-text > p::before {
            content: '→ ';
          }
        `)
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
      },
      { columns, text },
    )

    await startDrag(nested, text, 'page')
    await nested.locator(COPY).waitFor()

    const styles = await nested.evaluate(
      ({ uuid, copy }) => {
        const app = window.__BLOKKLI__!.app!
        const read = (element: Element) => [
          getComputedStyle(element).color,
          getComputedStyle(element, '::before').content,
        ]
        const original = app.dom
          .getDragElement(app.blocks.getBlock(uuid)!)!
          .querySelector('p')!
        const copied = document.querySelector(`${copy} p`)!
        return { original: read(original), copy: read(copied) }
      },
      { uuid: text, copy: COPY },
    )
    expect(styles.original).toEqual(['rgb(200, 0, 0)', '"→ "'])
    expect(styles.copy).toEqual(styles.original)
  })

  test('keeps the pseudo-elements that show an attribute', async () => {
    const list = seedUuid('paragraph', 'teasers-events')
    await startDrag(teasers, list, 'page')
    await teasers.locator(COPY).waitFor()

    // The empty heading shows its placeholder: `content: attr(data-placeholder)`
    // (editable-placeholder, sandbox/frontend/app/assets/css/main.css).
    const placeholders = await teasers.evaluate(
      ({ uuid, copy }) => {
        const app = window.__BLOKKLI__!.app!
        const read = (element: Element) =>
          getComputedStyle(element, '::before').content
        const original = app.dom
          .getDragElement(app.blocks.getBlock(uuid)!)!
          .querySelector('h2')!
        const copied = document.querySelector(`${copy} h2`)!
        return { original: read(original), copy: read(copied) }
      },
      { uuid: list, copy: COPY },
    )
    expect(placeholders.original).toBe('"Events"')
    expect(placeholders.copy).toBe(placeholders.original)
  })

  test("keeps a structure item's computed styles", async () => {
    await openSidebar(page, 'structure')
    const item = `[data-test="structure-item"][data-test-uuid="${widget}"]`
    await page.locator(item).waitFor()

    await startDrag(page, widget, 'structure')
    await page.locator(COPY).waitFor()

    // The item's label: the copy has no classes, only its computed styles.
    const styles = await page.evaluate(
      ({ item, copy }) => {
        const properties = [
          'display',
          'font-size',
          'padding-left',
          'color',
          'background-color',
        ]
        const read = (element: Element) => {
          const style = getComputedStyle(element)
          return properties.map((p) => `${p}: ${style.getPropertyValue(p)}`)
        }
        const original = document.querySelector(item)!.firstElementChild!
        const copied =
          document.querySelector(copy)!.firstElementChild!.firstElementChild!
        return { original: read(original), copy: read(copied) }
      },
      { item, copy: COPY },
    )
    expect(styles.copy).toEqual(styles.original)
  })
})
