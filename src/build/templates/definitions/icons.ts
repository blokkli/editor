import { defineCodeTemplate } from '../defineTemplate'
import { basename } from 'node:path'
import { falsy, onlyUnique, toValidVariableName } from '../../helpers'
import { toImports, toObject } from '../helpers'
import { USED_MATERIAL_ICONS } from './../../used-icons'
import type { BlockDefinitionOptionsInputBase } from '../../../global/types/definitions'

function getIconsFromOptions(
  options?: BlockDefinitionOptionsInputBase,
): string[] {
  return Object.values(options ?? {})
    .flatMap((option) => {
      if (option.type === 'radios' && option.displayAs === 'icons') {
        return Object.values(option.options ?? {}).map((v) => v.icon)
      }
    })
    .filter(falsy)
}

export default defineCodeTemplate(
  'icons',
  (ctx) => {
    const imports = new Map<string, string>()
    const icons = new Map<string, string>()

    const files = ctx.icons.files.values()

    const blockIcons = [...ctx.blocks.files.values()].flatMap((v) => {
      const icon = v.definition?.editor?.icon
      return [icon, ...getIconsFromOptions(v.definition?.options)]
    })

    const featureIcons = [...ctx.features.files.values()].map(
      (v) => v.getDefinition()?.definition.icon,
    )

    const globalOptionsIcons = getIconsFromOptions(
      ctx.helper.options.globalOptions,
    )

    const definitionIcons = [
      ...blockIcons,
      ...featureIcons,
      ...USED_MATERIAL_ICONS,
      ...globalOptionsIcons,
    ]
      .filter(falsy)
      .filter(onlyUnique)

    for (const file of files) {
      const name = basename(file.filePath, '.svg').toLowerCase()
      const importName = 'icon_' + toValidVariableName(name)
      const realtivePath = ctx.helper.toModuleBuildRelative(file.filePath)
      imports.set(importName, `${realtivePath}?raw`)
      icons.set(name, importName)
    }

    // Get the valid material icon names.
    const materialIcons = definitionIcons.filter(
      (v) => v.startsWith('bk_mdi_') && ctx.icons.isValidIconName(v),
    )

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
        .map((name) => `"${name}"`)
        .join('\n  | ') || "'never'"

    return `
import type { MaterialIconName } from './material-icons.d'

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
