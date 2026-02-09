import { Mutation } from '../Mutation'
import type { MutationContext } from '#mock/state/EditState'

export type MutationRearrangeArgs = {
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  uuids: string[]
}

export class MutationRearrange extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('rearrange', configuration)
  }

  override getAffectedUuid(args: MutationRearrangeArgs): string | undefined {
    return args.uuids[0]
  }

  override execute(context: MutationContext, args: MutationRearrangeArgs) {
    // Move each block after the previous one to establish the desired order.
    let after: string | null = null
    for (const uuid of args.uuids) {
      context.moveProxyAfter(uuid, after)
      after = uuid
    }
  }
}
