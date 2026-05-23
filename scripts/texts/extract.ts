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

export interface Extraction {
  key: string
  defaultText?: string
}

export type FunctionCall = {
  code: string
  start: number
}

export function extractFunctionCalls(
  name: string,
  sourceCode: string,
): FunctionCall[] {
  let inTCall = false
  let parenthesisCount = 0
  let currentTCall = ''
  let currentStart = 0
  const tCalls: FunctionCall[] = []

  for (let i = 0; i < sourceCode.length; i++) {
    const char = sourceCode[i]

    if (inTCall) {
      currentTCall += char
      if (char === '(') {
        parenthesisCount++
      } else if (char === ')') {
        parenthesisCount--
        if (parenthesisCount === 0) {
          tCalls.push({ code: currentTCall, start: currentStart })
          inTCall = false
          currentTCall = ''
        }
      }
    } else if (sourceCode.substring(i, i + name.length) === name) {
      inTCall = true
      parenthesisCount = 1
      currentTCall = name
      currentStart = i
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

/**
 * Replace `$t('oldKey', ...)` with `$t('newKey', ...)` in the given source.
 *
 * Uses the same parser-based discovery as extraction, so only real string
 * literals are touched (template literals with the same content are skipped).
 * Preserves the original quote style around the key.
 */
export function replaceTranslationKeyInSource(
  source: string,
  oldKey: string,
  newKey: string,
): { source: string; count: number } {
  const calls = extractFunctionCalls('$t(', source)

  type Edit = { start: number; end: number; replacement: string }
  const edits: Edit[] = []

  for (const call of calls) {
    let tree: any
    try {
      tree = parse(call.code, { ecmaVersion: 'latest' })
    } catch {
      continue
    }
    const firstArg = tree.body[0]?.expression?.arguments?.[0]
    if (!firstArg || firstArg.type !== 'Literal' || firstArg.value !== oldKey) {
      continue
    }

    const literalRaw = call.code.substring(firstArg.start, firstArg.end)
    const quote = literalRaw[0]
    if (quote !== "'" && quote !== '"') {
      continue
    }
    edits.push({
      start: call.start + firstArg.start,
      end: call.start + firstArg.end,
      replacement: `${quote}${newKey}${quote}`,
    })
  }

  if (edits.length === 0) {
    return { source, count: 0 }
  }

  edits.sort((a, b) => b.start - a.start)
  let result = source
  for (const edit of edits) {
    result =
      result.substring(0, edit.start) +
      edit.replacement +
      result.substring(edit.end)
  }

  return { source: result, count: edits.length }
}

function extractText(program: any): Extraction | undefined {
  const node = getExpression(program)
  const firstArg = node.arguments[0]

  // Skip calls where the first argument is not a string literal (e.g. $t(variable, variable)).
  if (
    firstArg &&
    firstArg.type !== 'Literal' &&
    firstArg.type !== 'TemplateLiteral'
  ) {
    return undefined
  }

  const key = extractLiteral(firstArg, 'key')
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
      .map(({ code }) => {
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

export function getSourceFiles(): string[] {
  const srcPattern = path.resolve(__dirname, './../../src') + '/**/*.{vue,ts}'
  const packagesPattern =
    path.resolve(__dirname, './../../packages') + '/*/src/runtime/**/*.{vue,ts}'
  return [...glob.sync(srcPattern), ...glob.sync(packagesPattern)]
}

export async function getSourceTexts(): Promise<Record<string, string>> {
  const extractor = new Extractor()
  const files = getSourceFiles()
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
