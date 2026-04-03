import { type ComputedRef, computed, ref } from 'vue'
import type { AdapterContext } from '../adapter'
import {
  translations,
  type InterfaceLanguage,
  type TranslationMap,
} from '#blokkli-build/translations'
import {
  defaultLanguage,
  forceDefaultLanguage,
} from '#blokkli-build/editor-config'
import { LANGUAGES } from '../../../global/constants'

export type TextProvider = (key: string, defaultValue?: string) => string

function isInterfaceLanguage(value: string): value is InterfaceLanguage {
  return (LANGUAGES as readonly string[]).includes(value)
}

const DEBUG_SWISS_GERMAN = false

export default function (context?: ComputedRef<AdapterContext>): TextProvider {
  const allTranslations =
    ref<Record<InterfaceLanguage, TranslationMap>>(translations)

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/translations', (mod) => {
      if (mod?.translations) {
        allTranslations.value = mod.translations
      }
    })
  }

  const language = computed<InterfaceLanguage>(() => {
    if (forceDefaultLanguage) {
      return defaultLanguage
    }

    if (
      context?.value.language &&
      isInterfaceLanguage(context.value.language)
    ) {
      return context.value.language
    }

    return defaultLanguage
  })

  const currentTranslations = computed<TranslationMap>(() => {
    const today = new Date()
    const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1

    // April Fools easter egg: Use Swiss German for German speakers.
    if (
      (isAprilFirst && language.value === 'de') ||
      (DEBUG_SWISS_GERMAN && import.meta.dev)
    ) {
      return (
        allTranslations.value.gsw_CH ||
        allTranslations.value[language.value] ||
        {}
      )
    }

    return allTranslations.value[language.value] || {}
  })

  return (key: string, defaultValue?: string) => {
    const existingForCurrent = currentTranslations.value[key]
    if (existingForCurrent) {
      return existingForCurrent
    }

    if (language.value === 'gsw_CH') {
      const fallback = translations.de[key]
      if (fallback) {
        return fallback
      }
    }

    return defaultValue || key
  }
}
