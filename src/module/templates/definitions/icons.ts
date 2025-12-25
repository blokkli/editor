import { defineCodeTemplate } from '../defineTemplate'
import { basename } from 'node:path'
import { falsy, onlyUnique, toValidVariableName } from './../../../helpers'
import { toImports, toObject } from '../helpers'
import { USED_MATERIAL_ICONS } from './../../used-icons'

const KEEP_ICONS = [
  'window-minimize',
  'window-maximize',
  'dock-window',
  'loader',
  'star',
  'unstar',
  'logo',
  'artboard',
  'robot',
  'youtube',
  'vimeo',
  'tiktok',
  'duplicate',
  'arrow-right-thin',
  'spinner',
  'reusable',
  'reusable-detach',
]

export default defineCodeTemplate(
  'icons',
  (ctx) => {
    const imports = new Map<string, string>()
    const icons = new Map<string, string>()

    const files = ctx.icons.files.values()

    const blockIcons = [...ctx.blocks.files.values()].map(
      (v) => v.definition?.editor?.icon,
    )
    const featureIcons = [...ctx.features.files.values()].map(
      (v) => v.getDefinition()?.definition.icon,
    )
    const definitionIcons = [
      ...blockIcons,
      ...featureIcons,
      ...USED_MATERIAL_ICONS,
    ]
      .filter(falsy)
      .filter(onlyUnique)

    for (const file of files) {
      const name = basename(file.filePath, '.svg').toLowerCase()
      const importName = 'icon_' + toValidVariableName(name)
      imports.set(importName, `${file.filePath}?raw`)
      icons.set(name, importName)
    }
    const materialIcons = definitionIcons.filter((v) => v.startsWith('bk_mdi_'))

    for (const icon of materialIcons) {
      const importName = 'icon_' + toValidVariableName(icon)
      const mdiImportName = icon.replace('bk_mdi_', '')
      imports.set(
        importName,
        `@material-symbols/svg-600/rounded/${mdiImportName}.svg?raw`,
      )
      icons.set(icon, importName)
    }

    return `${toImports(imports)}

${toObject('icons', icons)}
`
  },
  (ctx) => {
    const allIconNames =
      [...ctx.icons.files.values()]
        .map((file) => {
          return basename(file.filePath, '.svg').toLowerCase()
        })
        .sort()
        .filter((v) => v.includes('icon-blokkli') || KEEP_ICONS.includes(v))
        .map((name) => `"${name}"`)
        .join('\n  | ') || "'never'"

    return `
import type { MaterialIconName } from '${ctx.helper.relativePaths.RUNTIME_ICONS}'

type ProvidedIconName =
  | ${allIconNames}

export type BlokkliIcon = MaterialIconName | ProvidedIconName
export declare const icons: Record<BlokkliIcon, string>
`
  },
  {
    dependencies: ['icons', 'block-content'],
  },
)
