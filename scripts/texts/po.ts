import fs from 'node:fs'
import path from 'node:path'
import { po as PO, type GetTextTranslation } from 'gettext-parser'
import { sortObjectKeys } from './../../src/build/helpers'

export type TranslationEntry = {
  source: string
  translation: string
}

export async function readPoFile(
  language: string,
): Promise<Record<string, TranslationEntry>> {
  const poFilePath = path.resolve(__dirname, `./../../i18n/${language}.po`)
  const poData = await fs.promises.readFile(poFilePath, {
    encoding: 'utf-8',
  })
  const poFile = PO.parse(poData, { defaultCharset: 'utf-8' })

  const entries: Record<string, TranslationEntry> = {}

  Object.entries(poFile.translations).forEach(([key, entry]) => {
    const translation = Object.entries(entry)[0]?.[1]
    if (translation?.msgid && translation.msgstr[0] !== undefined) {
      entries[key] = {
        source: translation.msgid,
        translation: translation.msgstr[0],
      }
    }
  })

  return entries
}

export async function updateTranslationFile(
  language: string,
  sourceTexts: Record<string, string>,
) {
  const existingTexts = await readPoFile(language)

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
    `./../../src/runtime/editor/translations/${language}.json`,
  )
  const formatted = JSON.stringify(sorted, null, 2) + '\n'
  await fs.promises.writeFile(filePath, formatted)
}

export async function generatePO(
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

export async function updatePoKeys(
  language: string,
  updates: Record<string, string>,
): Promise<void> {
  const entries = await readPoFile(language)

  for (const [key, value] of Object.entries(updates)) {
    if (!entries[key]) {
      throw new Error(`Key "${key}" does not exist in ${language}.po`)
    }
    entries[key].translation = value
  }

  const sorted = sortObjectKeys(entries)
  await generatePO(language, sorted)

  const filePath = path.resolve(
    __dirname,
    `./../../src/runtime/editor/translations/${language}.json`,
  )
  const formatted = JSON.stringify(sorted, null, 2) + '\n'
  await fs.promises.writeFile(filePath, formatted)
}
