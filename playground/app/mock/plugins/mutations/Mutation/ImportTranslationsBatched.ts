import type { MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'

export type MutationImportTranslationsBatchedArgs = {
  items: Array<{
    langcode: string
    uuid: string
    fieldName: string
    fieldValue: string
  }>
  markUpToDate?: boolean
}

export class MutationImportTranslationsBatched extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('import_translations_batched', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationImportTranslationsBatchedArgs,
  ) {
    // Group items by uuid+langcode to batch setTranslationValues calls.
    const grouped = new Map<string, Map<string, Record<string, string>>>()

    for (const item of args.items) {
      let langMap = grouped.get(item.uuid)
      if (!langMap) {
        langMap = new Map()
        grouped.set(item.uuid, langMap)
      }
      let values = langMap.get(item.langcode)
      if (!values) {
        values = {}
        langMap.set(item.langcode, values)
      }
      values[item.fieldName] = item.fieldValue
    }

    for (const [uuid, langMap] of grouped) {
      // Check if this is the host entity.
      if (uuid === context.entity.uuid) {
        for (const [langcode, values] of langMap) {
          context.entity.setTranslationValues(langcode, values)
        }
        continue
      }

      const proxy = context.getProxy(uuid)
      if (!proxy) continue

      for (const [langcode, values] of langMap) {
        proxy.block.setTranslationValues(langcode, values)

        if (args.markUpToDate) {
          const raw = proxy.block.get('outdatedTranslations').getPropValue()
          let current: string[] = []
          if (raw) {
            try {
              current = JSON.parse(raw)
            } catch {
              /* ignore invalid JSON */
            }
          }
          proxy.block.setValues({
            outdatedTranslations: JSON.stringify(
              current.filter((lc) => lc !== langcode),
            ),
          })
        }
      }
    }
  }
}
