import { BlockProxy, type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '~/app/mock/entityStorage'

export type MutationAddReusableItemArgs = {
  libraryItemUuid: string
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string
}

export class MutationAddReusableItem extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add_reusable_item', configuration)
  }

  execute(context: MutationContext, args: MutationAddReusableItemArgs) {
    const uuid = this.getUuidForNewEntity()

    const block = entityStorageManager.createBlock('from_library', uuid)
    block.setValues({
      libraryItem: args.libraryItemUuid,
    })

    const proxy = new BlockProxy(
      block,
      args.hostEntityType,
      args.hostEntityUuid,
      args.hostField,
    )

    context.addProxy(proxy, args.preceedingUuid)
  }
}
