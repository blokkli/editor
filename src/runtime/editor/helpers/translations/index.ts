import type { TranslationState } from '#blokkli/editor/types/state'
import type { BlockTranslation } from '#blokkli/types/field'

/**
 * Whether a block, or the page, has a translation besides the source language.
 *
 * A block has translations of its own: one that was added after the page was
 * translated, or that has no translatable values, shows its source language in
 * every translation of the page.
 *
 * @param translation - The translation state of the page.
 * @param blockTranslations - The block's translations, or null for a field of
 * the page.
 */
export function hasOtherTranslations(
  translation: TranslationState,
  blockTranslations: BlockTranslation[] | null,
): boolean {
  const source = translation.sourceLanguage
  if (!translation.isTranslatable || !source) {
    return false
  }

  if (blockTranslations) {
    return blockTranslations.some((v) => v.langcode !== source)
  }

  return !!translation.translations?.some((v) => v.exists && v.id !== source)
}
