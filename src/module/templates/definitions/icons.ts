import { defineCodeTemplate } from '../defineTemplate'
import { basename } from 'node:path'
import { toValidVariableName } from './../../../helpers'

export default defineCodeTemplate(
  'icons',
  (ctx) => {
    const imports: string[] = []
    const icons: string[] = []

    const files = ctx.icons.files.values()

    for (const file of files) {
      const name = basename(file.filePath, '.svg').toLowerCase()
      const importName = 'icon_' + toValidVariableName(name)
      imports.push(`import ${importName} from '${file.filePath}?raw'`)
      icons.push(`'${name}': ${importName}`)
    }

    return `${imports.join('\n')}

export const icons = {
${icons.sort().join(',\n  ')}
}
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
export const icons: Record<BlokkliIcon, string>
`
  },
  {
    dependencies: ['icons'],
  },
)
