import * as Papa from 'papaparse'

export type CsvRow = {
  key: string
  source: string
  translation: string
}

export type MultiLangRow = {
  key: string
  source: string
  entityType?: string
  translations: Record<string, string>
}

export function buildCsv(rows: CsvRow[]): string {
  return Papa.unparse(rows, { header: true })
}

export function buildMultiLangCsv(
  rows: MultiLangRow[],
  languages: string[],
): string {
  const data = rows.map((row) => {
    const obj: Record<string, string> = {
      key: row.key,
      source: row.source,
    }
    for (const lang of languages) {
      obj[lang] = row.translations[lang] ?? ''
    }
    return obj
  })
  return Papa.unparse(data, { header: true })
}

export type ParsedCsv =
  | { type: 'single'; rows: CsvRow[] }
  | { type: 'multi'; languages: string[]; rows: MultiLangRow[] }

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  const fields = result.meta.fields ?? []
  const langColumns = fields.filter((f) => f !== 'key' && f !== 'source')

  // Single-language format: key,source,translation
  if (langColumns.length === 1 && langColumns[0] === 'translation') {
    return {
      type: 'single',
      rows: result.data.map((row) => ({
        key: row.key ?? '',
        source: row.source ?? '',
        translation: row.translation ?? '',
      })),
    }
  }

  // Multi-language format: key,source,de,fr,it,...
  return {
    type: 'multi',
    languages: langColumns,
    rows: result.data.map((row) => {
      const translations: Record<string, string> = {}
      for (const lang of langColumns) {
        translations[lang] = row[lang] ?? ''
      }
      return {
        key: row.key ?? '',
        source: row.source ?? '',
        translations,
      }
    }),
  }
}
