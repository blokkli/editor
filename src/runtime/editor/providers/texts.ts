import { type ComputedRef, computed } from 'vue'
import type { AdapterContext } from '../../adapter'
import { translations } from '#blokkli-build/translations'
import {
  defaultLanguage,
  forceDefaultLanguage,
} from '#blokkli-build/editor-config'

export type TextProvider = (key: string, defaultValue?: string) => string

type TranslationLanguage = keyof typeof translations

const DEBUG_SWISS_GERMAN = false

export default function (context?: ComputedRef<AdapterContext>): TextProvider {
  const language = computed<TranslationLanguage>(() => {
    if (forceDefaultLanguage) {
      return defaultLanguage as TranslationLanguage
    }

    if (
      context?.value.language &&
      (translations as any)[context.value.language]
    ) {
      return context.value.language as TranslationLanguage
    }

    return defaultLanguage as TranslationLanguage
  })

  const currentTranslations = computed<any>(() => {
    const today = new Date()
    const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1

    // April Fools easter egg: Use Swiss German for German speakers.
    if (
      (isAprilFirst && language.value === 'de') ||
      (DEBUG_SWISS_GERMAN && import.meta.dev)
    ) {
      return translations.gsw_CH || translations[language.value] || {}
    }

    return translations[language.value] || {}
  })

  return (key: string, defaultValue?: string) => {
    return currentTranslations.value[key] || defaultValue
  }
}
