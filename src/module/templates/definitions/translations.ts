import { defineTemplate } from '../defineTemplate'
import { defu } from 'defu'
import defaultTranslations from './../../../translations'

export default defineTemplate(
  'translations',
  (ctx) => {
    const translations: Record<string, Record<string, string>> = {}
    Object.keys(defaultTranslations).forEach((language) => {
      translations[language] = {}
      Object.keys((defaultTranslations as any)[language]).forEach((key) => {
        translations[language][key] = (defaultTranslations as any)[language][
          key
        ].translation
      })
    })
    const merged = defu(ctx.helper.options.translations, translations)
    return `export const translations = ${JSON.stringify(merged, null, 2)}`
  },
  () => {
    return `
export declare const translations: Record<string, Record<string, string>>
`
  },
)
