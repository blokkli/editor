import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationEditTranslationArgs = {
  uuid: string
  langcode: string
  values: Record<string, any[] | any>
}

export class MutationEditTranslation extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('edit_translation', configuration)
  }

  override getAffectedUuid(
    args: MutationEditTranslationArgs,
  ): string | undefined {
    return args.uuid
  }

  override execute(
    context: MutationContext,
    args: MutationEditTranslationArgs,
  ) {
    const proxy = context.getProxy(args.uuid)
    if (!proxy) {
      return
    }

    proxy.block.setTranslationValues(args.langcode, args.values)

    // Saving a translation marks it as no longer outdated.
    const raw = proxy.block.get('outdatedTranslations').getPropValue()
    let current: string[] = []
    if (raw === null || raw === undefined || raw === '') {
      current = ['de', 'fr', 'it']
    } else {
      try {
        current = JSON.parse(raw)
      } catch { /* ignore invalid JSON */ }
    }
    proxy.block.setValues({
      outdatedTranslations: JSON.stringify(
        current.filter((lc) => lc !== args.langcode),
      ),
    })
  }
}
