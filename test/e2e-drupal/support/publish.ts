import { url } from '@nuxt/test-utils/e2e'
import type { Locator, Page } from 'playwright-core'
import { waitForEditorReady, withApp } from './session'

/** A mode of the publish dialog (`data-test="publish-mode-<mode>"`). */
export function publishMode(
  page: Page,
  mode: 'save' | 'immediate' | 'scheduled',
): Locator {
  return page.locator(`[data-test="publish-mode-${mode}"]`)
}

/** Whether a publish-mode option is the currently selected one. */
export async function isModeChecked(mode: Locator): Promise<boolean> {
  return (await mode.getAttribute('data-test-checked')) === 'true'
}

/** Whether a publish-mode option can't be selected. */
export async function isModeDisabled(mode: Locator): Promise<boolean> {
  return (await mode.getAttribute('data-test-disabled')) === 'true'
}

/**
 * Close the editor's page after a publish (it leaves the editor), then open
 * the editor again: publishing deleted the edit state, so this shows what
 * Drupal stored.
 */
export async function reopenAfterPublish(
  page: Page,
  path: string,
): Promise<void> {
  await page.waitForURL((u) => !u.searchParams.has('blokkliEditing'))
  await page.goto(url(path))
  await waitForEditorReady(page)
}

export type PublishLanguageRow = {
  /** What publishing does to the language: `published`, `scheduled` or `unchanged`. */
  result: string | null
  checked: boolean
  disabled: boolean
}

/**
 * The rows of the publish dialog's section "Languages", keyed by langcode
 * (`all` when every language shares one status).
 */
export function publishLanguages(
  page: Page,
): Promise<Record<string, PublishLanguageRow>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [
        ...document.querySelectorAll(
          '[data-test^="publish-language-"][data-test-result]',
        ),
      ].map((row) => {
        const checkbox = row.querySelector<HTMLInputElement>(
          '[data-test="publish-languages-checkbox"]',
        )
        return [
          row.getAttribute('data-test')!.replace('publish-language-', ''),
          {
            result: row.getAttribute('data-test-result'),
            checked: !!checkbox?.checked,
            disabled: !!checkbox?.disabled,
          },
        ]
      }),
    ),
  )
}

/** Whether each translation of the page is published, keyed by langcode. */
export function translationStatuses(
  page: Page,
): Promise<Record<string, boolean>> {
  return withApp(page, (app) =>
    Object.fromEntries(
      (app.state.translation.value.translations ?? [])
        .filter((v) => v.exists)
        .map((v) => [v.id, v.status]),
    ),
  )
}
