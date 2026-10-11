import { defineCodeTemplate } from '../defineTemplate'
import { isBlock, isFragment } from '../../Collector/Blocks'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from '../../../global/constants'

export default defineCodeTemplate(
  'default-global-options',
  (ctx) => {
    const globalOptions = ctx.helper.options.globalOptions || {}
    const defaults = Object.entries(globalOptions).reduce<Record<string, any>>(
      (acc, [key, option]) => {
        if (option.default !== undefined && option.default !== null) {
          acc[key] = {
            default: option.default,
            type: option.type,
          }
        }
        return acc
      },
      {},
    )

    const bundlesWithVisibleLanguage: string[] = []
    const bundlesWithHiddenGlobally: string[] = []
    // Fragments are all blocks of one bundle: they're told apart by name.
    const fragmentsWithVisibleLanguage: string[] = []
    const fragmentsWithHiddenGlobally: string[] = []

    for (const file of ctx.blocks.files.values()) {
      const definition = file.definition
      if (!definition) {
        continue
      }
      const usedGlobalOptions = (definition.globalOptions || []) as string[]

      if (isBlock(definition)) {
        if (usedGlobalOptions.includes(BK_VISIBLE_LANGUAGES)) {
          bundlesWithVisibleLanguage.push(definition.bundle)
        }
        if (usedGlobalOptions.includes(BK_HIDDEN_GLOBALLY)) {
          bundlesWithHiddenGlobally.push(definition.bundle)
        }
      } else if (isFragment(definition)) {
        if (usedGlobalOptions.includes(BK_VISIBLE_LANGUAGES)) {
          fragmentsWithVisibleLanguage.push(definition.name)
        }
        if (usedGlobalOptions.includes(BK_HIDDEN_GLOBALLY)) {
          fragmentsWithHiddenGlobally.push(definition.name)
        }
      }
    }
    return `
export const bundlesWithVisibleLanguage = ${JSON.stringify(bundlesWithVisibleLanguage.sort())}
export const bundlesWithHiddenGlobally = ${JSON.stringify(bundlesWithHiddenGlobally.sort())}
export const fragmentsWithVisibleLanguage = ${JSON.stringify(fragmentsWithVisibleLanguage.sort())}
export const fragmentsWithHiddenGlobally = ${JSON.stringify(fragmentsWithHiddenGlobally.sort())}

export const globalOptionsDefaults = ${JSON.stringify(defaults, null, 2)}`
  },
  (ctx) => {
    return `
import type { BlockOptionDefinition } from '${ctx.helper.relativePaths.TYPES_BLOKK_OPTIONS}'

type GlobalOptionsDefaults = {
  type: BlockOptionDefinition['type']
  default: any
}

export declare const bundlesWithVisibleLanguage: string[]
export declare const bundlesWithHiddenGlobally: string[]
export declare const fragmentsWithVisibleLanguage: string[]
export declare const fragmentsWithHiddenGlobally: string[]

export declare const globalOptionsDefaults: Record<string, GlobalOptionsDefaults>
`
  },
  {
    dependencies: ['block-path'],
  },
)
