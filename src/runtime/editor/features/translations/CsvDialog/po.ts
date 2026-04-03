import PO from 'pofile'
import type { CsvRow } from './csv'

export function buildPo(
  rows: CsvRow[],
  language: string,
): string {
  const po = new PO()

  po.headers = {
    'Project-Id-Version': 'blokkli',
    'POT-Creation-Date': new Date().toISOString(),
    Language: language,
    'MIME-Version': '1.0',
    'Content-Type': 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding': '8bit',
  }

  for (const row of rows) {
    const item = new PO.Item()
    item.msgctxt = row.key
    item.msgid = row.source
    item.msgstr = [row.translation]
    po.items.push(item)
  }

  return po.toString()
}

export type ParsedPo = {
  language: string | undefined
  rows: CsvRow[]
}

export function parsePo(text: string): ParsedPo {
  const po = PO.parse(text)
  const rows: CsvRow[] = []

  for (const item of po.items) {
    if (!item.msgctxt) continue

    rows.push({
      key: item.msgctxt,
      source: item.msgid,
      translation: item.msgstr[0] ?? '',
    })
  }

  return {
    language: po.headers.Language || undefined,
    rows,
  }
}
