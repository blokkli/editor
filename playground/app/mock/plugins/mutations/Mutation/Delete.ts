import type { MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'

export type MutationDeleteArgs = {
  uuids: string[]
}

export class MutationDelete extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('delete', configuration)
  }

  override execute(context: MutationContext, args: MutationDeleteArgs) {
    args.uuids.forEach((uuid) => {
      const proxy = context.getProxy(uuid)
      if (proxy) {
        proxy.markAsDeleted()
      }
    })
  }
}
