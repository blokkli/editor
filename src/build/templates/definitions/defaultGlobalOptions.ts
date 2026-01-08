import { defineCodeTemplate } from '../defineTemplate'
import { isBlock } from '../../Collector/Blocks'
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

    for (const file of ctx.blocks.files.values()) {
      if (!file.definition || !isBlock(file.definition)) {
        continue
      }
      const usedGlobalOptions = (file.definition.globalOptions ||
        []) as string[]

      if (usedGlobalOptions.includes(BK_VISIBLE_LANGUAGES)) {
        bundlesWithVisibleLanguage.push(file.definition.bundle)
      }

      if (usedGlobalOptions.includes(BK_HIDDEN_GLOBALLY)) {
        bundlesWithHiddenGlobally.push(file.definition.bundle)
      }
    }
    return `
export const bundlesWithVisibleLanguage = ${JSON.stringify(bundlesWithVisibleLanguage.sort())}
export const bundlesWithHiddenGlobally = ${JSON.stringify(bundlesWithHiddenGlobally.sort())}

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

export declare const globalOptionsDefaults: Record<string, GlobalOptionsDefaults>
`
  },
  {
    dependencies: ['block-path'],
  },
)
