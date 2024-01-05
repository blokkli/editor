import type { UpdateBlockOptionEvent } from '#blokkli/types'
import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationUpdateOptionsArgs = {
  options: UpdateBlockOptionEvent[]
}

export class MutationUpdateOptions extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('update_options', configuration)
  }

  getAffectedUuid(args: MutationUpdateOptionsArgs): string | undefined {
    return args.options[0]?.uuid
  }

  execute(context: MutationContext, args: MutationUpdateOptionsArgs) {
    args.options.forEach((option) => {
      const proxy = context.getProxy(option.uuid)
      if (!proxy) {
        return
      }

      proxy.setOptionOverride(option.key, option.value)
    })
  }
}
