import fs from 'node:fs'
import path from 'node:path'
import type { BaseCallExpression, Expression, SpreadElement } from 'estree'
import { parse } from 'acorn'
import chalk from 'chalk'
import { glob } from 'glob'
import { format } from './../helpers'
import { sortObjectKeys } from './../../src/helpers'
import { po as PO, type GetTextTranslation } from 'gettext-parser'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from '../../src/runtime/helpers/symbols'

const INTERNAL_TRANSLATIONS = {
  [`blockOption_${BK_VISIBLE_LANGUAGES}_label`]: 'Visible languages',
  [`blockOption_${BK_HIDDEN_GLOBALLY}_label`]: 'Hide globally',
}

const LANGUAGES = ['de', 'fr', 'it', 'gsw_CH']

function extractFunctionCalls(name: string, sourceCode: string): string[] {
  let inTCall = false
  let parenthesisCount = 0
  let currentTCall = ''
  const tCalls: string[] = []

  for (let i = 0; i < sourceCode.length; i++) {
    const char = sourceCode[i]

    if (inTCall) {
      currentTCall += char
      if (char === '(') {
        parenthesisCount++
      } else if (char === ')') {
        parenthesisCount--
        if (parenthesisCount === 0) {
          tCalls.push(currentTCall)
          inTCall = false
          currentTCall = ''
        }
      }
    } else if (sourceCode.substring(i, i + name.length) === name) {
      inTCall = true
      parenthesisCount = 1
      currentTCall = name
      i += name.length - 1
    }
  }

  return tCalls
}

function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

interface Extraction {
  key: string
  defaultText?: string
}

function getExpression(program: any): BaseCallExpression {
  return program.body[0]?.expression
}

function extractLiteral(
  literal: Expression | SpreadElement | undefined,
  argument: string,
): string | undefined {
  if (literal) {
    if (literal.type === 'Literal') {
      if (literal.value && typeof literal.value === 'string') {
        return literal.value
      }
    } else if (literal.type === 'TemplateLiteral') {
      return literal.quasis.map((v) => v.value.raw).join('')
    }
  }
  if (literal) {
    if (literal.type !== 'Literal') {
      throw new Error("Variables can't be used as arguments.")
    } else if (typeof literal.value !== 'string') {
      throw new TypeError('Only strings can be used as arguments.')
    }
  }
  throw new Error(`Failed to extract value for argument "${argument}".`)
}

function extractText(program: any): Extraction | undefined {
  const node = getExpression(program)

  const key = extractLiteral(node.arguments[0], 'key')
  const defaultText = extractLiteral(node.arguments[1], 'defaultText')

  if (key) {
    return { key, defaultText }
  }
}

type ExtractedFeatureSettings = {
  label: string
  description?: string
  options?: Record<string, { label: string }>
}

type ExtractedFeature = {
  id: string
  label: string
  description: string
  settings: Record<string, ExtractedFeatureSettings>
}

/**
 * Service to handle text extractions across multiple files.
 */
class Extractor {
  texts: Record<string, Extraction> = {}
  isBuild = false

  constructor(isBuild = false) {
    this.isBuild = isBuild
  }

  /**
   * Add files by path.
   */
  addFiles(files: string[]) {
    return Promise.all(files.map((v) => this.handleFile(v)))
  }

  /**
   * Read the file and extract the texts.
   *
   * Returns a promise containing a boolean that indicated if the given file
   * should trigger a rebuild of the query.
   */
  async handleFile(filePath: string) {
    const source = await this.readFile(filePath)
    const extractions = this.getExtractions(source, filePath)
    extractions.forEach((extraction) => {
      this.texts[extraction.key] = extraction
    })
  }

  /**
   * Find all possible extractions from the given source.
   */
  getExtractions(source: string, filePath: string) {
    const extractions: Extraction[] = []
    if (source.includes('$t(')) {
      extractions.push(...this.extractSingle(source, filePath))
    }

    if (source.includes('defineBlokkliFeature(')) {
      extractions.push(...this.extractFeatureSettings(source, filePath))
    }
    return extractions
  }

  handleError(filePath: string, code: string, e: any) {
    const message =
      typeof e === 'object' && e !== null
        ? e.message
        : 'Failed to parse text arguments.'

    console.error(message + filePath + '\n' + chalk.red(code))

    if (this.isBuild) {
      throw new Error('Failed to extract texts.')
    }
  }

  /**
   * Extract the single text method calls.
   */
  extractSingle(source: string, filePath: string): Extraction[] {
    return extractFunctionCalls('$t(', source)
      .map((code) => {
        try {
          const tree = parse(code, {
            ecmaVersion: 'latest',
          })

          let extractedTree: any = null
          extractedTree = extractText(tree)
          return extractedTree
        } catch (e) {
          this.handleError(filePath, code, e)
        }
      })
      .filter(falsy)
  }

  extractFeatureSettings(source: string, _filePath: string): Extraction[] {
    return extractFunctionCalls('defineBlokkliFeature(', source)
      .map((code) => {
        const extractions: Extraction[] = []

        const obj = code
          .substring(0, code.length - 1)
          .replace('defineBlokkliFeature(', '')

        // eslint-disable-next-line prefer-const
        let result: ExtractedFeature | null = null
        eval('result = ' + obj)
        const feature: ExtractedFeature | null = result as any

        if (feature?.settings) {
          Object.keys(feature.settings).forEach((key) => {
            const setting = feature.settings[key]
            extractions.push({
              key: 'feature_' + feature.id + '_setting_' + key + '_label',
              defaultText: setting.label,
            })

            if (setting.description) {
              extractions.push({
                key:
                  'feature_' + feature.id + '_setting_' + key + '_description',
                defaultText: setting.description,
              })
            }

            if (setting.options) {
              Object.entries(setting.options).forEach(([optionKey, option]) => {
                extractions.push({
                  key:
                    'feature_' +
                    feature.id +
                    '_setting_' +
                    key +
                    '_option_' +
                    optionKey,
                  defaultText: option.label,
                })
              })
            }
          })
        }

        return extractions
      })
      .flat()
      .filter(falsy)
  }

  /**
   * Read the given file and return its contents.
   */
  readFile(filePath: string) {
    return fs.promises.readFile(filePath).then((v) => {
      return v.toString()
    })
  }

  getTexts() {
    return Object.values(this.texts)
  }
}

async function getSourceTexts(): Promise<Record<string, string>> {
  const extractor = new Extractor()
  const pattern = path.resolve(__dirname, './../../src') + '/**/*.vue'
  const files = glob.sync(pattern)
  await extractor.addFiles(files)

  return extractor
    .getTexts()
    .flat()
    .reduce<Record<string, string>>((acc, v) => {
      if (!v.defaultText) {
        throw new Error('Missing default text for key: ' + v.key)
      }
      acc[v.key] = v.defaultText
      return acc
    }, {})
}

type TranslationEntry = {
  source: string
  translation: string
}

async function updateTranslationFile(
  language: string,
  sourceTexts: Record<string, string>,
) {
  const poFilePath = path.resolve(__dirname, `./../../i18n/${language}.po`)
  const poData = await fs.promises.readFile(poFilePath, {
    encoding: 'utf-8',
  })
  const poFile = PO.parse(poData, 'utf-8')

  const existingTexts: Record<string, TranslationEntry> = {}

  Object.entries(poFile.translations).forEach(([key, entry]) => {
    const translation = Object.entries(entry)[0][1]
    existingTexts[key] = {
      source: translation.msgid,
      translation: translation.msgstr[0],
    }
  })

  // Add missing keys to translations.
  Object.entries(sourceTexts).forEach(([key, text]) => {
    if (!existingTexts[key]) {
      existingTexts[key] = {
        source: text,
        translation: '',
      }
    }

    existingTexts[key].source = text
  })

  // Remove keys that are not needed anymore.
  Object.keys(existingTexts).forEach((key) => {
    if (!sourceTexts[key]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete existingTexts[key]
      return
    }
  })

  const sorted = sortObjectKeys(existingTexts)
  await generatePO(language, sorted)

  const filePath = path.resolve(
    __dirname,
    `./../../src/translations/${language}.json`,
  )
  const formatted = await format(JSON.stringify(sorted, null, 2), 'json')
  await fs.promises.writeFile(filePath, formatted)
}

async function generatePO(
  language: string,
  texts: Record<string, TranslationEntry>,
): Promise<void> {
  const translations: Record<string, GetTextTranslation> = {}

  Object.entries(texts).forEach(([key, text]) => {
    translations[key] = {
      msgctxt: key,
      msgid: text.source,
      msgstr: [text.translation],
    }
  })
  const result = PO.compile({
    charset: 'utf-8',
    headers: {
      Language: language,
    },
    translations: {
      blokkli: translations,
    },
  }).toString()

  const filePath = path.resolve(__dirname, `./../../i18n/${language}.po`)

  await fs.promises.writeFile(filePath, result)
}

async function main() {
  const sourceTexts = await getSourceTexts()

  await Promise.all(
    LANGUAGES.map((v) =>
      updateTranslationFile(v, { ...sourceTexts, ...INTERNAL_TRANSLATIONS }),
    ),
  )
}

main()
