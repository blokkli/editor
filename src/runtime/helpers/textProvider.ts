import { type ComputedRef, computed } from 'vue'
import { translations } from '#blokkli/translations'
import { useRuntimeConfig } from '#imports'
import type { AdapterContext } from '../adapter'

export type TextProvider = (key: string, defaultValue?: string) => string

export default function (context?: ComputedRef<AdapterContext>): TextProvider {
  // @ts-ignore
  const defaultLanguage = useRuntimeConfig().public.blokkli
    .defaultLanguage as keyof typeof translations
  const language = computed(() => {
    if (
      context?.value.language &&
      (translations as any)[context.value.language]
    ) {
      return context.value.language as keyof typeof translations
    }
    return defaultLanguage
  })
  const currentTranslations = computed<any>(() => {
    return translations[language.value] || {}
  })

  return (key: string, defaultValue?: string) => {
    return currentTranslations.value[key] || defaultValue
  }
}
