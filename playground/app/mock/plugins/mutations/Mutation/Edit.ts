import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationEditArgs = {
  uuid: string
  // A link field submits an object (uri + title), not a string.
  values: Record<string, any>
}

export class MutationEdit extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('edit', configuration)
  }

  override getAffectedUuid(args: MutationEditArgs): string | undefined {
    return args.uuid
  }

  override execute(context: MutationContext, args: MutationEditArgs) {
    const proxy = context.getProxy(args.uuid)
    if (!proxy) {
      return
    }

    proxy.block.setValues(args.values)

    // Editing the source block marks all translations as outdated.
    proxy.block.setValues({
      outdatedTranslations: JSON.stringify(['de', 'fr', 'it']),
    })
  }
}
