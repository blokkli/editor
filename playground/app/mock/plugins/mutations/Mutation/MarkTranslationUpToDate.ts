import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationMarkTranslationUpToDateArgs = {
  uuids: string[]
  langcode: string
}

export class MutationMarkTranslationUpToDate extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('mark_translation_up_to_date', configuration)
  }

  override getAffectedUuid(
    args: MutationMarkTranslationUpToDateArgs,
  ): string | undefined {
    return args.uuids[0]
  }

  override execute(
    context: MutationContext,
    args: MutationMarkTranslationUpToDateArgs,
  ) {
    for (const uuid of args.uuids) {
      const proxy = context.getProxy(uuid)
      if (!proxy) continue

      const raw = proxy.block.get('outdatedTranslations').getPropValue()
      let current: string[] = []
      if (raw === null || raw === undefined || raw === '') {
        current = proxy.block.getTranslationLanguages()
      } else {
        try {
          current = JSON.parse(raw)
        } catch {
          /* ignore invalid JSON */
        }
      }
      const updated = current.filter((lc) => lc !== args.langcode)
      proxy.block.setValues({ outdatedTranslations: JSON.stringify(updated) })
    }
  }
}
