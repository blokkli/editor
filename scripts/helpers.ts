import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as prettier from 'prettier'

export async function format(data: string, parser: 'json' | 'typescript') {
  const prettierConfigFile = await fs.readFile(
    path.resolve(__dirname, './../.prettierrc'),
    'utf8',
  )

  const prettierConfig = JSON.parse(prettierConfigFile)
  return await prettier.format(data, {
    ...prettierConfig,
    parser,
  })
}
