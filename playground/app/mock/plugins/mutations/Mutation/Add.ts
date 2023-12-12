import { BlockProxy, type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '~/app/mock/entityStorage'

export type MutationAddArgs = {
  bundle: string
  values: Record<string, any>
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string
}

export class MutationAdd extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add', configuration)
  }

  execute(context: MutationContext, args: MutationAddArgs) {
    const uuid = this.getUuidForNewEntity()

    const block = entityStorageManager.createBlock(args.bundle, uuid)
    block.setValues(args.values)

    const proxy = new BlockProxy(
      block,
      args.hostEntityType,
      args.hostEntityUuid,
      args.hostField,
    )

    context.addProxy(proxy, args.preceedingUuid)
  }
}
