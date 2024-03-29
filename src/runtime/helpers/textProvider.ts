import { type ComputedRef, computed } from 'vue'
import type { AdapterContext } from '../adapter'
import { translations } from '#blokkli/translations'
import { defaultLanguage, forceDefaultLanguage } from '#blokkli/config'

export type TextProvider = (key: string, defaultValue?: string) => string

type TranslationLanguage = keyof typeof translations

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
    return translations[language.value] || {}
  })

  return (key: string, defaultValue?: string) => {
    return currentTranslations.value[key] || defaultValue
  }
}
