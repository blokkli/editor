import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { selectBlock } from './../../support/blocks'
import { topLevelBlockUuids } from './../../support/selection'
import { toolbarButton } from './../../support/toolbar'
import { emitEvent } from './../../support/events'

/**
 * The command palette (`features/command-palette`) is a keyboard-driven launcher
 * for editor commands. Its toolbar button toggles a centered `SearchOverlay`;
 * `Cmd/Ctrl+K` opens it via the global `keyPressed` shortcut. The overlay lists
 * every enabled command (`commands.getCommands()` + menu-button plugins), sorted
 * by stored use-frequency, fuzzy-filters as you type (`fzf`, loaded async), and
 * runs the focused/clicked command — incrementing its frequency, then closing.
 *
 * The palette runs a non-English locale, so nothing here asserts on translated
 * labels. The signals are locale-independent: the `data-test-command-id` of each
 * item, which item carries `data-test-focused="true"`, document order, and the
 * `blokkli:commandPaletteFrequency` localStorage record (which proves a command
 * ran *and* which one). The one search query is derived at runtime from a real
 * command's label — we type it but only assert on ids/counts.
 *
 * Keyboard handling lives in `SearchOverlay` (`Tab`/`ArrowDown` → next,
 * `Shift+Tab`/`ArrowUp` → prev, both wrapping; `Enter` selects; `Escape` closes)
 * and the input auto-focuses on mount, so the key presses below go to it.
 */

const FREQUENCY_KEY = 'blokkli:commandPaletteFrequency'

/** The palette container (present only while open). */
function palette(page: Page): Locator {
  return page.locator('[data-test="command-palette"]')
}

/** The palette's search input. */
function paletteInput(page: Page): Locator {
  return palette(page).locator('[data-test="text-input"]')
}

/** All rendered command items, in document order. */
function paletteItems(page: Page): Locator {
  return page.locator('[data-test="command-palette-item"]')
}

/** Open the palette via its toolbar button and wait until it's ready. */
async function openPalette(page: Page): Promise<void> {
  await toolbarButton(page, 'command_palette').click()
  await palette(page).waitFor({ state: 'visible' })
  await paletteItems(page).first().waitFor({ state: 'visible' })
}

/** The command ids of all visible items, in document order. */
function itemIds(page: Page): Promise<string[]> {
  return paletteItems(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-test-command-id') ?? ''),
  )
}

/** The index of the currently-focused item (the one with
 * `data-test-focused="true"`), or -1 if none. */
function focusedIndex(page: Page): Promise<number> {
  return paletteItems(page).evaluateAll((els) =>
    els.findIndex((el) => el.getAttribute('data-test-focused') === 'true'),
  )
}

/** The stored command-use frequency map (empty object when unset). */
function commandFrequency(page: Page): Promise<Record<string, number>> {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}')
    } catch {
      return {}
    }
  }, FREQUENCY_KEY)
}

/**
 * Page lifecycle: one editor page shared by all tests. `afterEach` closes the
 * palette if open, clears the `blokkli:commandPaletteFrequency` localStorage
 * (so tests 9/10 see exactly `{ <cmd>: 1 }` and test 3 sees `{}`), and
 * deselects (test 5 leaves a block selected). The palette is fully unmounted
 * when closed, so input text and focused index reset naturally on each open.
 */
describe('The command palette', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await palette(page).isVisible()) {
      await page.keyboard.press('Escape')
      await palette(page).waitFor({ state: 'detached' })
    }
    await page.evaluate((key) => localStorage.removeItem(key), FREQUENCY_KEY)
    await emitEvent(page, 'select:unselect')
  })

  test('the toolbar button opens the palette and focuses the search input', async () => {
    expect(await palette(page).count()).toBe(0)
    await openPalette(page)

    expect(await palette(page).count()).toBe(1)
    // The input is focused on open, so keystrokes drive navigation immediately.
    expect(
      await paletteInput(page).evaluate((el) => el === document.activeElement),
    ).toBe(true)
    expect(await paletteItems(page).count()).toBeGreaterThan(0)
  })

  test('Cmd/Ctrl+K opens the palette', async () => {
    expect(await palette(page).count()).toBe(0)

    await page.keyboard.press('Control+k')
    if (!(await palette(page).count())) {
      // Cover both modifier conventions; on the CI platform Control wins.
      await page.keyboard.press('Meta+k')
    }

    await palette(page).waitFor({ state: 'visible' })
    expect(await palette(page).count()).toBe(1)
  })

  test('Escape closes the palette without running a command', async () => {
    await openPalette(page)

    await page.keyboard.press('Escape')
    await palette(page).waitFor({ state: 'detached' })
    expect(await palette(page).count()).toBe(0)
    // Escape closes — it must not select the focused command.
    expect(await commandFrequency(page)).toEqual({})
  })

  test('clicking outside the palette closes it', async () => {
    await openPalette(page)

    // The open palette lays a full-screen overlay over the editor; a click on it
    // (anywhere outside the palette) closes it via the window click-away handler.
    await page.mouse.click(5, 5)
    await palette(page).waitFor({ state: 'detached' })
    expect(await palette(page).count()).toBe(0)
  })

  test('selecting a block closes the palette', async () => {
    const first = (await topLevelBlockUuids(page))[0]!
    await openPalette(page)

    // The palette watches the selection and closes on any change.
    await selectBlock(page, first)
    await palette(page).waitFor({ state: 'detached' })
    expect(await palette(page).count()).toBe(0)
  })

  test('typing filters the command list', async () => {
    await openPalette(page)
    const totalBefore = await paletteItems(page).count()

    // Derive a query from a real command's label (locale-independent: we type
    // the label but assert only on ids/counts).
    const target = await withApp(page, (app) =>
      app.commands.getCommands().find((c) => c.label && c.label.length >= 4),
    )
    if (!target) {
      throw new Error('No command with a usable label to search for')
    }

    await paletteInput(page).fill(target.label)
    // `fzf` loads asynchronously, so poll until the list actually narrows.
    await expect
      .poll(() => paletteItems(page).count())
      .toBeLessThan(totalBefore)
    expect(await itemIds(page)).toContain(target.id)

    // A query that matches nothing empties the list.
    await paletteInput(page).fill('zzzqxwv123nomatch')
    await expect.poll(() => paletteItems(page).count()).toBe(0)
  })

  test('typing resets the focus to the first item', async () => {
    await openPalette(page)

    await page.keyboard.press('ArrowDown')
    expect(await focusedIndex(page)).toBe(1)

    // Any text change resets the highlighted index back to the top.
    await paletteInput(page).fill('a')
    await expect.poll(() => focusedIndex(page)).toBe(0)
  })

  test('arrow keys move and wrap the focused item', async () => {
    await openPalette(page)
    const total = await paletteItems(page).count()
    expect(total).toBeGreaterThan(1)
    expect(await focusedIndex(page)).toBe(0)

    await page.keyboard.press('ArrowDown')
    expect(await focusedIndex(page)).toBe(1)

    await page.keyboard.press('ArrowUp')
    expect(await focusedIndex(page)).toBe(0)

    // Wrap around: up from the first item lands on the last.
    await page.keyboard.press('ArrowUp')
    expect(await focusedIndex(page)).toBe(total - 1)
  })

  test('Tab and Shift+Tab navigate the focused item', async () => {
    await openPalette(page)
    expect(await paletteItems(page).count()).toBeGreaterThan(1)
    expect(await focusedIndex(page)).toBe(0)

    // Tab moves to the next item (default focus traversal is prevented).
    await page.keyboard.press('Tab')
    expect(await focusedIndex(page)).toBe(1)

    await page.keyboard.press('Shift+Tab')
    expect(await focusedIndex(page)).toBe(0)
  })

  test('Enter runs the focused command and closes the palette', async () => {
    await openPalette(page)

    const focusedId = (await itemIds(page))[await focusedIndex(page)]!
    await page.keyboard.press('Enter')

    await palette(page).waitFor({ state: 'detached' })
    expect(await palette(page).count()).toBe(0)
    // Selecting records the command's use — proving it ran, and which one.
    expect((await commandFrequency(page))[focusedId]).toBe(1)
  })

  test('clicking an item runs its command and closes the palette', async () => {
    await openPalette(page)

    // Click a specific (non-first) item and assert exactly that one ran.
    const target = paletteItems(page).nth(1)
    const targetId = (await target.getAttribute('data-test-command-id'))!
    await target.click()

    await palette(page).waitFor({ state: 'detached' })
    expect(await palette(page).count()).toBe(0)
    expect((await commandFrequency(page))[targetId]).toBe(1)
  })
})
