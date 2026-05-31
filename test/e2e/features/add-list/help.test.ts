import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'

/**
 * Interaction behaviour of the add list (left toolbar):
 *
 *  - hovering it expands the panel (`bk-is-active` → `data-test-expanded`);
 *  - keeping the pointer on an item a bit longer opens the help overlay
 *    (`data-test="add-list-help"`) for that bundle/action. Each help item
 *    (`data-test="add-list-help-<type>-<id>"`) shows the item's icon, label and
 *    description, and marks itself visible via `data-test-visible`.
 *
 * Collapsed, an item is only 50px wide (its icon) while its DOM box spans the
 * full expanded width, so we hover the icon area (`x: 25`) rather than the
 * element centre. Expected icon/label/description are read from the live
 * definitions so the assertions hold regardless of the editor's locale.
 */

const TITLE = '[data-test="add-list-help-title"]'
const DESCRIPTION = '[data-test="add-list-help-description"]'

/** Locator for the help heading's icon (the `Icon` carries `data-test="icon-<name>"`). */
function helpIcon(help: Locator, icon: string): Locator {
  return help.locator(
    `[data-test="add-list-help-icon"] [data-test="icon-${icon}"]`,
  )
}

/** Hover an add-list item's icon and resolve once its help item is visible. */
async function hoverForHelp(
  page: Page,
  group: 'add-list-blocks' | 'add-list-actions',
  itemId: string,
  helpSelector: string,
): Promise<Locator> {
  await page
    .locator(`[data-test="${group}"] [data-test="add-list-item-${itemId}"]`)
    .hover({ position: { x: 25, y: 25 } })

  const help = page.locator(helpSelector)
  await expect.poll(() => help.getAttribute('data-test-visible')).toBe('true')
  return help
}

/** The label, description and editor icon a block bundle is defined with. */
function bundleInfo(page: Page, bundle: string) {
  return page.evaluate((bundle) => {
    const app = window.__BLOKKLI__!.app!
    const definition = app.types.getBlockBundleDefinition(bundle)
    return {
      label: definition?.label ?? '',
      description: definition?.description ?? '',
      icon:
        app.definitions.getBlockDefinition(bundle, 'default', null)?.editor
          ?.icon ?? null,
    }
  }, bundle)
}

/** The title, description and icon an add action is defined with. */
function actionInfo(page: Page, id: string) {
  return page.evaluate((id) => {
    const app = window.__BLOKKLI__!.app!
    const action = app.plugins.get('addAction').find((v) => v.id === id)
    return {
      title: action?.title ?? '',
      description: action?.description ?? '',
      icon: action?.icon ?? null,
    }
  }, id)
}

/**
 * Page lifecycle: one editor page is opened in `beforeAll` and shared by all
 * tests. The "expands on hover" test MUST run first — it relies on the
 * collapsed initial state, which any subsequent hover would expand. The
 * remaining tests assume the list is expanded (the state test leaves it that
 * way) and each hovers a different item; the help overlay's per-item
 * `data-test-visible` is poll-asserted, so a lingering previous-item hover
 * resolves naturally as the new item takes over.
 */
describe('The add list interaction', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  test('hovering the add list expands it', async () => {
    const inner = page.locator('[data-test="add-list"] [data-test-expanded]')
    expect(await inner.getAttribute('data-test-expanded')).toBe('false')

    await page.locator('[data-test="add-list"]').hover()
    await expect
      .poll(() => inner.getAttribute('data-test-expanded'))
      .toBe('true')
  })

  for (const bundle of ['card', 'grid']) {
    test(`hovering the "${bundle}" block shows its help with the correct icon, label and description`, async () => {
      const expected = await bundleInfo(page, bundle)

      const help = await hoverForHelp(
        page,
        'add-list-blocks',
        bundle,
        `[data-test="add-list-help-bundle-${bundle}"]`,
      )

      // The help overlay is open.
      expect(
        await page.locator('[data-test="add-list-help"]').isVisible(),
      ).toBe(true)

      expect(await help.locator(TITLE).textContent()).toBe(expected.label)
      expect(await helpIcon(help, expected.icon!).count()).toBe(1)
      expect(await help.locator(DESCRIPTION).innerHTML()).toBe(
        expected.description,
      )
    })
  }

  test('the grid help lists its fields and their allowed blocks', async () => {
    // Expected fields + allowed bundles, from the live grid field config (the
    // help lists every allowed bundle per field — internal ones included).
    const expectedFields = await page.evaluate(() => {
      const app = window.__BLOKKLI__!.app!
      return app.types.fieldConfig
        .all()
        .filter((config) => config.entityBundle === 'grid')
        .map((config) => ({
          name: config.name,
          allowed: [...config.allowedBundles],
        }))
    })

    const help = await hoverForHelp(
      page,
      'add-list-blocks',
      'grid',
      '[data-test="add-list-help-bundle-grid"]',
    )

    // The help renders the same set of fields the grid defines.
    const renderedFields = await help
      .locator('[data-test^="add-list-help-field-"]')
      .evaluateAll((els) =>
        els.map((el) =>
          el.getAttribute('data-test')!.replace('add-list-help-field-', ''),
        ),
      )
    expect(renderedFields.sort()).toEqual(
      expectedFields.map((field) => field.name).sort(),
    )

    // Each field lists exactly its allowed bundles.
    for (const field of expectedFields) {
      const allowed = await help
        .locator(
          `[data-test="add-list-help-field-${field.name}"] [data-test^="add-list-help-allowed-"]`,
        )
        .evaluateAll((els) =>
          els.map((el) =>
            el.getAttribute('data-test')!.replace('add-list-help-allowed-', ''),
          ),
        )
      expect(allowed.sort()).toEqual([...field.allowed].sort())
    }
  })

  test('the fragment action help lists all available fragments', async () => {
    // The fragments available for placement, from the live definitions. They all
    // share the `blokkli_fragment` bundle, so each is identified by its label.
    const expectedLabels = await page.evaluate(() => {
      const app = window.__BLOKKLI__!.app!
      const available = app.dom.generallyAvailableFragments.value
      return app.definitions.fragmentDefinitions.value
        .filter((definition) =>
          (available as string[]).includes(definition.name),
        )
        .map((definition) => definition.label)
    })
    expect(expectedLabels.length).toBeGreaterThan(0)

    const help = await hoverForHelp(
      page,
      'add-list-actions',
      'fragment',
      '[data-test="add-list-help-action-fragment"]',
    )

    const renderedLabels = await help
      .locator(
        '[data-test="add-list-help-field-fragments"] [data-test="add-list-help-allowed-blokkli_fragment"]',
      )
      .evaluateAll((els) => els.map((el) => el.textContent!.trim()))

    expect(renderedLabels.sort()).toEqual([...expectedLabels].sort())
  })

  test('hovering an action shows its help with the correct icon, label and description', async () => {
    const expected = await actionInfo(page, 'template')

    const help = await hoverForHelp(
      page,
      'add-list-actions',
      'template',
      '[data-test="add-list-help-action-template"]',
    )

    expect(await page.locator('[data-test="add-list-help"]').isVisible()).toBe(
      true,
    )

    expect(await help.locator(TITLE).textContent()).toBe(expected.title)
    expect(await helpIcon(help, expected.icon!).count()).toBe(1)
    expect(await help.locator(DESCRIPTION).innerHTML()).toBe(
      expected.description,
    )
  })
})
