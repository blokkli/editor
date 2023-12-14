import type { UpdateBlokkliItemOptionEvent } from '#blokkli/types'
import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationUpdateOptionsArgs = {
  options: UpdateBlokkliItemOptionEvent[]
}

export class MutationUpdateOptions extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('update_options', configuration)
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
