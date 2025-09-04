import type { UpdateHostOptionEvent } from '#blokkli/types'
import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationUpdateHostOptionsArgs = {
  options: UpdateHostOptionEvent[]
}

export class MutationUpdateHostOptions extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('update_host_options', configuration)
  }

  override execute(context: MutationContext, args: MutationUpdateHostOptionsArgs) {
    args.options.forEach((option) => {
      context.updateHostOption(option.key, option.value)
    })
  }
}
