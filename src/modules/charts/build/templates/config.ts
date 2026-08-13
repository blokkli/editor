import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { ChartsModuleOptions } from '../types'

/**
 * Locales offered in the number-format editor when a project doesn't override
 * them. Only the ids are listed: the labels are derived at runtime from the
 * locale id via `Intl`, so there is nothing else to maintain here.
 */
export const DEFAULT_NUMBER_FORMAT_LOCALES = [
  'de-CH',
  'fr-CH',
  'it-CH',
  'de-DE',
  'en-US',
  'en-GB',
  'fr-FR',
]

/**
 * Emits the static charts configuration resolved from the module options.
 *
 * This is a single artifact shared by all editor-level settings — add new keys
 * to `chartsConfig` here rather than creating a template per value.
 */
export default function (options: ChartsModuleOptions | undefined) {
  const numberFormatLocales =
    options?.numberFormat?.locales ?? DEFAULT_NUMBER_FORMAT_LOCALES

  return defineCodeTemplate(
    'charts-config',
    () => `export const chartsConfig = {
  numberFormatLocales: ${JSON.stringify(numberFormatLocales)},
}
`,
    () => `export const chartsConfig: {
  numberFormatLocales: string[]
}
`,
    { write: true },
  )
}
