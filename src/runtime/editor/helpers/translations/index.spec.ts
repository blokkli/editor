import { describe, it, expect } from 'vitest'
import type { TranslationState } from '#blokkli/editor/types/state'
import { hasOtherTranslations } from './index'

const translation: TranslationState = {
  isTranslatable: true,
  sourceLanguage: 'en',
  translations: [
    { id: 'en', url: '/en', exists: true, status: true },
    { id: 'de', url: '/de', exists: true, status: true },
    { id: 'fr', url: '/fr', exists: false, status: false },
  ],
}

const block = (...langcodes: string[]) =>
  langcodes.map((langcode) => ({ langcode, isPublished: true }))

describe('hasOtherTranslations', () => {
  it('checks the translations that the page has', () => {
    expect(hasOtherTranslations(translation, null)).toBe(true)
    expect(
      hasOtherTranslations(
        {
          ...translation,
          translations: translation.translations!.filter((v) => v.id !== 'de'),
        },
        null,
      ),
    ).toBe(false)
  })

  it("checks a block's own translations", () => {
    expect(hasOtherTranslations(translation, block('en', 'de'))).toBe(true)
    // Not translated, although the page is.
    expect(hasOtherTranslations(translation, block('en'))).toBe(false)
    expect(hasOtherTranslations(translation, [])).toBe(false)
  })

  it('is false for a page that is not translatable', () => {
    expect(
      hasOtherTranslations({ ...translation, isTranslatable: false }, null),
    ).toBe(false)
    expect(
      hasOtherTranslations(
        { ...translation, isTranslatable: false },
        block('en', 'de'),
      ),
    ).toBe(false)
    expect(
      hasOtherTranslations({ ...translation, sourceLanguage: null }, null),
    ).toBe(false)
  })
})
