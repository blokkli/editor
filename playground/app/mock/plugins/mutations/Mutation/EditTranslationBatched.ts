import type { MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'

export type MutationEditTranslationBatchedArgs = {
  langcode: string
  items: Array<{ uuid: string; values: Record<string, any[] | any> }>
}

export class MutationEditTranslationBatched extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('edit_translation_batched', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationEditTranslationBatchedArgs,
  ) {
    for (const item of args.items) {
      const proxy = context.getProxy(item.uuid)
      if (!proxy) {
        continue
      }

      proxy.block.setTranslationValues(args.langcode, item.values)

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
          current.filter((lc) => lc !== args.langcode),
        ),
      })
    }
  }
}
