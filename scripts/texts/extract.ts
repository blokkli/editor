import fs from 'node:fs'
import path from 'node:path'
import type { BaseCallExpression, Expression, SpreadElement } from 'estree'
import { parse } from 'acorn'
import chalk from 'chalk'
import { glob } from 'glob'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from '../../src/global/constants'

export const INTERNAL_TRANSLATIONS = {
  [`blockOption_${BK_VISIBLE_LANGUAGES}_label`]: 'Visible languages',
  [`blockOption_${BK_VISIBLE_LANGUAGES}_description`]:
    'Only show on specific languages.',
  [`blockOption_${BK_HIDDEN_GLOBALLY}_label`]: 'Hide globally',
  [`blockOption_${BK_HIDDEN_GLOBALLY}_description`]: 'Always hides the block.',
}

export const LANGUAGES = ['de', 'fr', 'it', 'gsw_CH']

export interface Extraction {
  key: string
  defaultText?: string
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

export function extractFunctionCalls(
  name: string,
  sourceCode: string,
): string[] {
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

/**
 * Service to handle text extractions across multiple files.
 */
export class Extractor {
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
        // oxlint-disable-next-line
        eval('result = ' + obj)
        const feature: ExtractedFeature | null = result as any

        if (feature?.label) {
          extractions.push({
            key: 'feature_' + feature.id + '_label',
            defaultText: feature.label,
          })
        }

        if (feature?.description) {
          extractions.push({
            key: 'feature_' + feature.id + '_description',
            defaultText: feature.description,
          })
        }

        if (feature?.settings) {
          Object.keys(feature.settings).forEach((key) => {
            const setting = feature.settings[key]!
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

export async function getSourceTexts(): Promise<Record<string, string>> {
  const extractor = new Extractor()
  const srcPattern = path.resolve(__dirname, './../../src') + '/**/*.{vue,ts}'
  const packagesPattern =
    path.resolve(__dirname, './../../packages') + '/*/src/runtime/**/*.{vue,ts}'
  const files = [...glob.sync(srcPattern), ...glob.sync(packagesPattern)]
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
