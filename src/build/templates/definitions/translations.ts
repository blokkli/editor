import { defineCodeTemplate } from '../defineTemplate'
import { LANGUAGES } from '../../../global/constants'

const TRANSLATIONS_DIR = './runtime/editor/translations'

export default defineCodeTemplate(
  'translations',
  (ctx) => {
    const userTranslations = ctx.helper.options.translations
    const hasUserTranslations =
      userTranslations && Object.keys(userTranslations).length > 0

    const loaderEntries = LANGUAGES.map((lang) => {
      const relativePath = ctx.helper.toModuleBuildRelative(
        ctx.helper.resolvers.module.resolve(`${TRANSLATIONS_DIR}/${lang}.json`),
      )
      const override = hasUserTranslations
        ? `defu(userTranslations['${lang}'] ?? {}, process(mod.default))`
        : `process(mod.default)`
      return `  '${lang}': async () => {
    const mod = await import('${relativePath}')
    return ${override}
  }`
    }).join(',\n')

    const preamble = hasUserTranslations
      ? `import { defu } from 'defu'\n\nconst userTranslations = ${JSON.stringify(userTranslations)}\n\n`
      : ''

    return `${preamble}function process(raw) {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v.translation]),
  )
}

export const translationLoaders = {
${loaderEntries}
}
`
  },
  () => {
    const typeUnion = LANGUAGES.map((lang) => `'${lang}'`).join(' | ')
    return `
export type InterfaceLanguage = ${typeUnion}
export type TranslationMap = Record<string, string>
export const translationLoaders: Record<InterfaceLanguage, () => Promise<TranslationMap>>
`
  },
)
