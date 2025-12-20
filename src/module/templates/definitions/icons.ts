import { defineCodeTemplate } from '../defineTemplate'
import { basename } from 'node:path'
import { toValidVariableName } from './../../../helpers'
import { toImports, toObject } from '../helpers'

export default defineCodeTemplate(
  'icons',
  (ctx) => {
    const imports = new Map<string, string>()
    const icons = new Map<string, string>()

    const files = ctx.icons.files.values()

    for (const file of files) {
      const name = basename(file.filePath, '.svg').toLowerCase()
      const importName = 'icon_' + toValidVariableName(name)
      imports.set(importName, `${file.filePath}?raw`)
      icons.set(name, importName)
    }

    return `${toImports(imports)}

${toObject('icons', icons)}
`
  },
  (ctx) => {
    const allIconNames = [...ctx.icons.files.values()]
      .map((file) => {
        return basename(file.filePath, '.svg').toLowerCase()
      })
      .sort()
      .map((name) => `"${name}"`)
      .join('\n  | ')

    return `
export type BlokkliIcon =
  | ${allIconNames}
export declare const icons: Record<BlokkliIcon, string>
`
  },
  {
    dependencies: ['icons'],
  },
)
