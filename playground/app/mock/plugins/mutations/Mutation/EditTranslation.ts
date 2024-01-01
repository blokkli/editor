import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationEditTranslationArgs = {
  uuid: string
  langcode: string
  values: Record<string, any[]>
}

export class MutationEditTranslation extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('edit_translation', configuration)
  }

  execute(context: MutationContext, args: MutationEditTranslationArgs) {
    const proxy = context.getProxy(args.uuid)
    if (!proxy) {
      return
    }

    proxy.block.setTranslationValues(args.langcode, args.values)
  }
}
