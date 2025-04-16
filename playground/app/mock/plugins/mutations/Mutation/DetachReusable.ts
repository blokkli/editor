import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'
import type { BlockFromLibrary } from '#mock/state/Block/FromLibrary'
import type { Block } from '#mock/state/Block/Block'

export type MutationDetachReusableArgs = {
  uuids: string[]
}

export class MutationDetachReusable extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('detach_reusable', configuration)
  }

  override execute(context: MutationContext, args: MutationDetachReusableArgs) {
    args.uuids.forEach((uuid) => {
      const proxy = context.getProxy(uuid)

      if (!proxy) {
        return
      }

      const block = proxy.block as BlockFromLibrary
      const libraryItem = block.getLibraryItem()
      if (!libraryItem) {
        return
      }

      const reusableBlock = libraryItem.getBlocks().getBlocks()[0]

      if (!reusableBlock) {
        return
      }

      const newUuid = this.getUuidForNewEntity()
      const clone = entityStorageManager.cloneBlock(
        reusableBlock,
        newUuid,
      ) as Block
      const cloneProxy = new BlockProxy(
        clone,
        proxy.hostEntityType,
        proxy.hostEntityUuid,
        proxy.hostField,
      )

      cloneProxy.overrideOptions = { ...proxy.overrideOptions }

      proxy.markAsDeleted()
      context.addProxy(cloneProxy, proxy.block.uuid)
    })
  }
}
