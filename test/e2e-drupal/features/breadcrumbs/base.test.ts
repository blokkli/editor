import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectedUuids } from '../../support/selection'
import { emitEvent } from '../../support/events'
import { openEditableField } from '../../support/editable'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/**
 * The breadcrumbs feature renders a `<ul>` reflecting the current selection: an
 * artboard root crumb, the host entity crumb, then a chain of block/field/
 * multiple crumbs produced by recursively walking the selected block's parent
 * chain (`getBlockCrumbs` → `buildCrumbs`), and an editable crumb when an inline
 * editable is open. The *last* crumb is the "current" one.
 *
 * The interesting, breakable logic is the chain assembly — alternating
 * field/block crumbs up the parent tree — and the multi-selection branches
 * (some-vs-all blocks in one field). The page "Nested"
 * (content/nodes/nested.yml) has columns in its `field_paragraphs`, with three
 * texts in their `field_right`, giving a real nested chain
 * (`page → field_paragraphs → columns → field_right → text`) and a field with a
 * known block count.
 *
 * Selectors are `data-test` only; assertions are locale-independent — block
 * crumbs are identified by `data-test-uuid`, field crumbs by `data-test-field`,
 * the multiple crumb by `data-test-count`, and the current crumb by
 * `data-test-current` (no translated label is read).
 */

type ReadCrumb = {
  id: string
  current: boolean
  uuid: string | null
  field: string | null
  count: number | null
}

/** The ordered list of rendered crumbs, read off the `data-test` contract. */
function readCrumbs(page: Page): Promise<ReadCrumb[]> {
  return page.locator('[data-test^="breadcrumb-"]').evaluateAll((els) =>
    els.map((el) => {
      const count = el.getAttribute('data-test-count')
      return {
        id: el.getAttribute('data-test')!,
        current: el.getAttribute('data-test-current') === 'true',
        uuid: el.getAttribute('data-test-uuid'),
        field: el.getAttribute('data-test-field'),
        count: count === null ? null : Number(count),
      }
    }),
  )
}

/** Click the interactive button inside a crumb (block/field/root crumbs). */
function clickCrumb(page: Page, selector: string): Promise<void> {
  return page.locator(`${selector} [data-test="crumb-button"]`).click()
}

const columns = seedUuid('paragraph', 'columns')
const title = seedUuid('paragraph', 'columns-title')
const texts = [
  seedUuid('paragraph', 'columns-text-1'),
  seedUuid('paragraph', 'columns-text-2'),
  seedUuid('paragraph', 'columns-text-3'),
]

/**
 * Page lifecycle: one editor page shared by all tests. Tests 1/7 don't read
 * the chain (they assert the empty / host-only shape), tests 2/3 use
 * `texts[0]` only, and tests 4/5/6 use all three. `afterEach` deselects
 * everything so each test starts from a known empty selection. Test 8 opens an
 * inline editable and is ordered last — `afterAll` closes the page so the
 * leftover overlay is harmless.
 */
describe('The breadcrumbs feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/nested', 'nested'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
  })

  test('shows only the root crumb (current) when nothing is selected', async () => {
    await expect
      .poll(() => readCrumbs(page))
      .toEqual([
        {
          id: 'breadcrumb-root',
          current: true,
          uuid: null,
          field: null,
          count: null,
        },
      ])
  })

  test('renders the full parent chain for a nested selection', async () => {
    await emitEvent(page, 'select', texts[0]!)

    // root → host → field_paragraphs (field) → columns (block) → field_right
    // (field) → text (block, current). The chain alternates field/block crumbs
    // up the tree.
    await expect
      .poll(() => readCrumbs(page))
      .toEqual([
        {
          id: 'breadcrumb-root',
          current: false,
          uuid: null,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-host',
          current: false,
          uuid: null,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-field',
          current: false,
          uuid: null,
          field: 'field_paragraphs',
          count: null,
        },
        {
          id: 'breadcrumb-block',
          current: false,
          uuid: columns,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-field',
          current: false,
          uuid: null,
          field: 'field_right',
          count: null,
        },
        {
          id: 'breadcrumb-block',
          current: true,
          uuid: texts[0]!,
          field: null,
          count: null,
        },
      ])
  })

  test('clicking a block crumb re-selects that block', async () => {
    await emitEvent(page, 'select', texts[0]!)
    await expect.poll(() => selectedUuids(page)).toEqual([texts[0]!])

    await clickCrumb(
      page,
      `[data-test="breadcrumb-block"][data-test-uuid="${columns}"]`,
    )

    // Selection jumps up to the columns, and the chain now ends at them.
    await expect.poll(() => selectedUuids(page)).toEqual([columns])
    const crumbs = await readCrumbs(page)
    const last = crumbs[crumbs.length - 1]
    expect(last).toMatchObject({
      id: 'breadcrumb-block',
      uuid: columns,
      current: true,
    })
  })

  test('clicking a field crumb selects every block in that field', async () => {
    await emitEvent(page, 'select', texts[0]!)
    await expect
      .poll(() => readCrumbs(page))
      .toContainEqual(
        expect.objectContaining({
          id: 'breadcrumb-field',
          field: 'field_right',
        }),
      )

    await clickCrumb(
      page,
      '[data-test="breadcrumb-field"][data-test-field="field_right"]',
    )

    // The whole `field_right` is now selected.
    await expect
      .poll(async () => (await selectedUuids(page)).slice().sort())
      .toEqual(texts.slice().sort())
  })

  test('selecting some blocks in one field shows a "multiple" crumb with the count', async () => {
    // Two of the three texts → the field crumb plus a "multiple" count crumb.
    await emitEvent(page, 'select', [texts[0]!, texts[1]!])

    await expect
      .poll(() => readCrumbs(page))
      .toEqual([
        {
          id: 'breadcrumb-root',
          current: false,
          uuid: null,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-host',
          current: false,
          uuid: null,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-field',
          current: false,
          uuid: null,
          field: 'field_paragraphs',
          count: null,
        },
        {
          id: 'breadcrumb-block',
          current: false,
          uuid: columns,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-field',
          current: false,
          uuid: null,
          field: 'field_right',
          count: null,
        },
        {
          id: 'breadcrumb-multiple',
          current: true,
          uuid: null,
          field: null,
          count: 2,
        },
      ])
  })

  test('selecting all blocks in a field makes the field crumb current (no "multiple")', async () => {
    // All three texts selected → the field collapses to the last/current crumb.
    await emitEvent(page, 'select', texts)

    await expect
      .poll(async () => {
        const crumbs = await readCrumbs(page)
        return {
          hasMultiple: crumbs.some((c) => c.id === 'breadcrumb-multiple'),
          last: crumbs[crumbs.length - 1],
        }
      })
      .toEqual({
        hasMultiple: false,
        last: expect.objectContaining({
          id: 'breadcrumb-field',
          field: 'field_right',
          current: true,
        }),
      })
  })

  test('host selection makes the host crumb current; clicking root resets', async () => {
    // `select:host` mirrors the host-crumb click (clear selection, then select
    // the host) — the host becomes the current crumb with no chain after it.
    await emitEvent(page, 'select:host')

    await expect
      .poll(() => readCrumbs(page))
      .toEqual([
        {
          id: 'breadcrumb-root',
          current: false,
          uuid: null,
          field: null,
          count: null,
        },
        {
          id: 'breadcrumb-host',
          current: true,
          uuid: null,
          field: null,
          count: null,
        },
      ])

    // Clicking the root crumb unselects everything, leaving only the root.
    await clickCrumb(page, '[data-test="breadcrumb-root"]')

    await expect
      .poll(() => readCrumbs(page))
      .toEqual([
        {
          id: 'breadcrumb-root',
          current: true,
          uuid: null,
          field: null,
          count: null,
        },
      ])
  })

  test('opening an inline editable adds a final, current editable crumb', async () => {
    await emitEvent(page, 'select', title)
    await openEditableField(page, 'field_title', title)

    // The editable field is always the final crumb and is the current one.
    await expect
      .poll(async () => {
        const crumbs = await readCrumbs(page)
        return crumbs[crumbs.length - 1]
      })
      .toMatchObject({ id: 'breadcrumb-editable', current: true })
  })
})
