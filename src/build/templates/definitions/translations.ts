import { defineCodeTemplate } from '../defineTemplate'
import { LANGUAGES } from '../../../global/constants'

const TRANSLATIONS_DIR = './runtime/editor/translations'

export default defineCodeTemplate(
  'translations',
  (ctx) => {
    const imports = LANGUAGES.map((lang) => {
      const relativePath = ctx.helper.toModuleBuildRelative(
        ctx.helper.resolvers.module.resolve(`${TRANSLATIONS_DIR}/${lang}.json`),
      )
      return `import raw_${lang} from '${relativePath}'`
    }).join('\n')

    const userTranslations = ctx.helper.options.translations

    // Build the processing code that extracts .translation from each entry.
    const processedEntries = LANGUAGES.map((lang) => {
      return `  '${lang}': Object.fromEntries(
    Object.entries(raw_${lang}).map(([k, v]) => [k, v.translation])
  )`
    }).join(',\n')

    const hasUserTranslations =
      userTranslations && Object.keys(userTranslations).length > 0

    if (hasUserTranslations) {
      return `import { defu } from 'defu'
${imports}

const defaultTranslations = {
${processedEntries}
}

export const translations = defu(${JSON.stringify(userTranslations)}, defaultTranslations)
`
    }

    return `${imports}

export const translations = {
${processedEntries}
}
`
  },
  () => {
    const typeUnion = LANGUAGES.map((lang) => `'${lang}'`).join(' | ')
    return `
export type InterfaceLanguage = ${typeUnion}
export type TranslationMap = Record<string, string>
export const translations: Record<InterfaceLanguage, TranslationMap>
`
  },
)
