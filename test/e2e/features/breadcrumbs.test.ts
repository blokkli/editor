import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import { addBlocks } from './../support/blocks'
import { selectedUuids } from './../support/selection'
import { emitEvent } from './../support/events'
import { openEditableField } from './../support/editable'

/**
 * The breadcrumbs feature renders a `<ul>` reflecting the current selection: an
 * artboard root crumb, the host entity crumb, then a chain of block/field/
 * multiple crumbs produced by recursively walking the selected block's parent
 * chain (`getBlockCrumbs` → `buildCrumbs`), and an editable crumb when an inline
 * editable is open. The *last* crumb is the "current" one.
 *
 * The interesting, breakable logic is the chain assembly — alternating
 * field/block crumbs up the parent tree — and the multi-selection branches
 * (some-vs-all blocks in one field). The playground page's `content` field
 * allows a `grid` block, and `grid` has a `blocks` field allowing `card`, giving
 * a real nested chain (`page → content → grid → blocks → card`) and a field with
 * a controlled block count.
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
  return page.locator(`${selector} button`).click()
}

/** A grid (in `content`) holding `cardCount` cards in its `blocks` field. */
async function addGridWithCards(
  page: Page,
  cardCount: number,
): Promise<{ grid: string; cards: string[] }> {
  const grid = 'bc-grid'
  const cards = Array.from({ length: cardCount }, (_, i) => `bc-card-${i}`)
  await addBlocks(page, [
    {
      bundle: 'grid',
      uuid: grid,
      children: { blocks: cards.map((uuid) => ({ bundle: 'card', uuid })) },
    },
  ])
  return { grid, cards }
}

describe('The breadcrumbs feature', async () => {
  await setupEditorE2E()

  test('shows only the root crumb (current) when nothing is selected', async () => {
    const page = await openEditor()

    expect(await readCrumbs(page)).toEqual([
      { id: 'breadcrumb-root', current: true, uuid: null, field: null, count: null },
    ])

    await page.close()
  })

  test('renders the full parent chain for a nested selection', async () => {
    const page = await openEditor()
    const { grid, cards } = await addGridWithCards(page, 1)

    await emitEvent(page, 'select', cards[0]!)

    // root → host → content (field) → grid (block) → blocks (field) → card
    // (block, current). The chain alternates field/block crumbs up the tree.
    await expect
      .poll(() => readCrumbs(page))
      .toEqual([
        { id: 'breadcrumb-root', current: false, uuid: null, field: null, count: null },
        { id: 'breadcrumb-host', current: false, uuid: null, field: null, count: null },
        { id: 'breadcrumb-field', current: false, uuid: null, field: 'content', count: null },
        { id: 'breadcrumb-block', current: false, uuid: grid, field: null, count: null },
        { id: 'breadcrumb-field', current: false, uuid: null, field: 'blocks', count: null },
        { id: 'breadcrumb-block', current: true, uuid: cards[0]!, field: null, count: null },
      ])

    await page.close()
  })

  test('clicking a block crumb re-selects that block', async () => {
    const page = await openEditor()
    const { grid, cards } = await addGridWithCards(page, 1)

    await emitEvent(page, 'select', cards[0]!)
    await expect.poll(() => selectedUuids(page)).toEqual([cards[0]!])

    await clickCrumb(page, `[data-test="breadcrumb-block"][data-test-uuid="${grid}"]`)

    // Selection jumps up to the grid, and the chain now ends at the grid block.
    await expect.poll(() => selectedUuids(page)).toEqual([grid])
    const crumbs = await readCrumbs(page)
    const last = crumbs[crumbs.length - 1]
    expect(last).toMatchObject({ id: 'breadcrumb-block', uuid: grid, current: true })

    await page.close()
  })

  test('clicking a field crumb selects every block in that field', async () => {
    const page = await openEditor()
    const { cards } = await addGridWithCards(page, 3)

    await emitEvent(page, 'select', cards[0]!)
    await expect.poll(() => readCrumbs(page)).toContainEqual(
      expect.objectContaining({ id: 'breadcrumb-field', field: 'blocks' }),
    )

    await clickCrumb(page, '[data-test="breadcrumb-field"][data-test-field="blocks"]')

    // The whole `blocks` field is now selected.
    await expect
      .poll(async () => (await selectedUuids(page)).slice().sort())
      .toEqual(cards.slice().sort())

    await page.close()
  })

  test('selecting some blocks in one field shows a "multiple" crumb with the count', async () => {
    const page = await openEditor()
    const { cards } = await addGridWithCards(page, 3)

    // Two of the three cards → the field crumb plus a "multiple" count crumb.
    await emitEvent(page, 'select', [cards[0]!, cards[1]!])

    await expect.poll(() => readCrumbs(page)).toEqual([
      { id: 'breadcrumb-root', current: false, uuid: null, field: null, count: null },
      { id: 'breadcrumb-host', current: false, uuid: null, field: null, count: null },
      { id: 'breadcrumb-field', current: false, uuid: null, field: 'content', count: null },
      { id: 'breadcrumb-block', current: false, uuid: 'bc-grid', field: null, count: null },
      { id: 'breadcrumb-field', current: false, uuid: null, field: 'blocks', count: null },
      { id: 'breadcrumb-multiple', current: true, uuid: null, field: null, count: 2 },
    ])

    await page.close()
  })

  test('selecting all blocks in a field makes the field crumb current (no "multiple")', async () => {
    const page = await openEditor()
    const { cards } = await addGridWithCards(page, 3)

    // All three cards selected → the field collapses to the last/current crumb.
    await emitEvent(page, 'select', cards)

    const crumbs = await readCrumbs(page)
    expect(crumbs.some((c) => c.id === 'breadcrumb-multiple')).toBe(false)
    const last = crumbs[crumbs.length - 1]
    expect(last).toMatchObject({ id: 'breadcrumb-field', field: 'blocks', current: true })

    await page.close()
  })

  test('host selection makes the host crumb current; clicking root resets', async () => {
    const page = await openEditor()

    // `select:host` mirrors the host-crumb click (clear selection, then select
    // the host) — the host becomes the current crumb with no chain after it.
    await emitEvent(page, 'select:unselect')
    await emitEvent(page, 'select:host')

    await expect.poll(() => readCrumbs(page)).toEqual([
      { id: 'breadcrumb-root', current: false, uuid: null, field: null, count: null },
      { id: 'breadcrumb-host', current: true, uuid: null, field: null, count: null },
    ])

    // Clicking the root crumb unselects everything, leaving only the root.
    await clickCrumb(page, '[data-test="breadcrumb-root"]')

    await expect.poll(() => readCrumbs(page)).toEqual([
      { id: 'breadcrumb-root', current: true, uuid: null, field: null, count: null },
    ])

    await page.close()
  })

  test('opening an inline editable adds a final, current editable crumb', async () => {
    const page = await openEditor()
    const { cards } = await addGridWithCards(page, 1)

    await emitEvent(page, 'select', cards[0]!)
    await openEditableField(page, 'title', cards[0]!)

    // The editable field is always the final crumb and is the current one.
    await expect
      .poll(async () => {
        const crumbs = await readCrumbs(page)
        return crumbs[crumbs.length - 1]
      })
      .toMatchObject({ id: 'breadcrumb-editable', current: true })

    await page.close()
  })
})
