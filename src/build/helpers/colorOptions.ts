import type { ColorOption } from '../../global/types/colorOptions'
import { DEFAULT_COLOR_OPTIONS } from '../../global/constants'
import { translateText } from './translations'

/**
 * blökkli's color palette, for a project that defines no `colorOptions`, with
 * its labels translated.
 *
 * @param translations - The editor's texts, keyed by language.
 */
export function getDefaultColorOptions(
  translations: Record<string, Record<string, string>>,
): Record<string, ColorOption> {
  return Object.fromEntries(
    Object.entries(DEFAULT_COLOR_OPTIONS).map(([id, option]) => [
      id,
      {
        ...option,
        label: translateText(
          `colorOption_${id}_label`,
          option.label,
          translations,
        ),
      },
    ]),
  )
}
