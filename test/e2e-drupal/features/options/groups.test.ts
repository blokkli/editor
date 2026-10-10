import { setup } from '@nuxt/test-utils/e2e'
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import { openOptionGroup } from '../../support/options'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

const CHART = seedUuid('paragraph', 'option-groups-chart')

/**
 * An option group's label comes from the module option `optionGroups`, in the
 * editor's interface language (the page's). The sandbox's chart has its options
 * "Width" and "Height" in the group `size`: "Size", "Grösse" in German.
 *
 * The English and the German page are opened one after the other: the first
 * creates the edit state.
 */
describe('Option groups', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  async function groupLabel(page: Page): Promise<string> {
    await selectBlock(page, CHART)
    await openOptionGroup(page, 'size')
    const label = await page
      .locator(
        '[data-test="option-group"][data-test-group="size"] [data-test="option-group-toggle"]',
      )
      .innerText()
    return label.trim()
  }

  test('shows the label in the interface language', async () => {
    resetSandbox(sandbox)

    const en = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/option-groups', 'option-groups'),
    )
    expect(await groupLabel(en)).toBe('Size')
    await en.close()

    const de = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/optionsgruppen', 'option-groups'),
    )
    expect(await groupLabel(de)).toBe('Grösse')
    await de.close()
  })
})
