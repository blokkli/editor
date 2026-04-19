import { shallowRef } from 'vue'
import {
  translationLoaders,
  type InterfaceLanguage,
  type TranslationMap,
  type TranslationLoaders,
} from '#blokkli-build/translations'
import {
  defaultLanguage,
  forceDefaultLanguage,
} from '#blokkli-build/editor-config'
import { TRANSLATION_LANGUAGES } from '../../../global/constants'

export type TextProvider = (key: string, defaultValue?: string) => string

function isInterfaceLanguage(value: string): value is InterfaceLanguage {
  return (TRANSLATION_LANGUAGES as readonly string[]).includes(value)
}

const DEBUG_SWISS_GERMAN = false

/**
 * Resolve the language whose JSON file should actually be loaded. On April
 * 1st, German users are silently redirected to Swiss German as an easter egg.
 */
function resolveEffectiveLanguage(requested: string): InterfaceLanguage {
  const today = new Date()
  const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1
  if (
    (isAprilFirst && requested === 'de') ||
    (DEBUG_SWISS_GERMAN && import.meta.dev && requested === 'de')
  ) {
    return 'gsw_CH'
  }

  if (forceDefaultLanguage) {
    return defaultLanguage
  }

  if (isInterfaceLanguage(requested)) {
    return requested
  }

  return defaultLanguage
}

export default async function (
  requestedLanguage: string,
): Promise<TextProvider> {
  const language = resolveEffectiveLanguage(requestedLanguage)

  const currentTranslations = shallowRef<TranslationMap>({})

  async function loadTranslations(
    loaders: TranslationLoaders,
    langcode: InterfaceLanguage,
  ) {
    const loader = loaders[langcode]
    if (loader) {
      currentTranslations.value = await loader()
    } else {
      currentTranslations.value = {}
    }
  }

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/translations', async (mod) => {
      if (mod?.translationLoaders) {
        loadTranslations(mod.translationLoaders, language)
      }
    })
  }

  await loadTranslations(translationLoaders, language)

  return (key: string, defaultValue?: string) => {
    return currentTranslations.value[key] || defaultValue || key
  }
}
