import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'

export type MutationAddReusableItemArgs = {
  libraryItemUuid: string
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string | null
}

export class MutationAddReusableItem extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add_reusable_item', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationAddReusableItemArgs,
  ) {
    const uuid = this.getUuidForNewEntity()

    const block = entityStorageManager.createBlock('from_library', uuid)
    const libraryItem = entityStorageManager.storages.library_item.load(
      args.libraryItemUuid,
    )
    if (!libraryItem) {
      return
    }
    const reusableBlock = libraryItem.getBlocks().getBlocks()[0]
    if (!reusableBlock) {
      return
    }
    block.setValues({
      libraryItem: args.libraryItemUuid,
    })

    const proxy = new BlockProxy(
      block,
      args.hostEntityType,
      args.hostEntityUuid,
      args.hostField,
    )
    block
      .options()
      .setList(JSON.parse(JSON.stringify(reusableBlock.options().list)))

    context.addProxy(proxy, args.preceedingUuid)
  }
}
