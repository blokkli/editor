import { type ComputedRef, computed, shallowRef, watch } from 'vue'
import type { AdapterContext } from '../adapter'
import {
  translationLoaders,
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

/**
 * Resolve the language whose JSON file should actually be loaded. On April
 * 1st, German users are silently redirected to Swiss German as an easter egg.
 */
function resolveEffectiveLanguage(
  requested: InterfaceLanguage,
): InterfaceLanguage {
  const today = new Date()
  const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1
  if (
    (isAprilFirst && requested === 'de') ||
    (DEBUG_SWISS_GERMAN && import.meta.dev && requested === 'de')
  ) {
    return 'gsw_CH'
  }
  return requested
}

export default async function (
  context?: ComputedRef<AdapterContext>,
): Promise<TextProvider> {
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

  const currentTranslations = shallowRef<TranslationMap>(
    await translationLoaders[resolveEffectiveLanguage(language.value)](),
  )

  watch(language, async (newLang) => {
    currentTranslations.value = await translationLoaders[
      resolveEffectiveLanguage(newLang)
    ]()
  })

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/translations', async (mod) => {
      if (mod?.translationLoaders) {
        currentTranslations.value = await mod.translationLoaders[
          resolveEffectiveLanguage(language.value)
        ]()
      }
    })
  }

  return (key: string, defaultValue?: string) => {
    return currentTranslations.value[key] || defaultValue || key
  }
}
