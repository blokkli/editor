import { falsy } from '#blokkli/helpers'
import { entityStorageManager } from '~/app/mock/entityStorage'
import type { Block } from '../../../state/Block/Block'
import { BlockProxy, MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationDuplicateArgs = {
  uuids: string[]
}

export class MutationDuplicate extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('duplicate', configuration)
  }

  execute(context: MutationContext, args: MutationDuplicateArgs) {
    let preceedingUuid = args.uuids
      .map((uuid) => {
        const index = context.getIndex(uuid)
        if (index !== undefined) {
          return {
            index,
            uuid,
          }
        }
      })
      .filter(falsy)
      .sort((a, b) => a.index - b.index)[0]?.uuid

    args.uuids.forEach((uuid) => {
      const proxy = context.getProxy(uuid)
      if (proxy) {
        const clone = this.duplicateProxy(context, proxy, preceedingUuid)
        preceedingUuid = clone.block.uuid
      }
    })
  }

  duplicateProxy(
    context: MutationContext,
    proxy: BlockProxy,
    preceedingUuid?: string,
  ): BlockProxy {
    const block = proxy.block
    const newUuid = this.getUuidForNewEntity(block.uuid)
    const clone = entityStorageManager.cloneBlock(block, newUuid) as Block
    const cloneProxy = new BlockProxy(
      clone,
      proxy.hostEntityType,
      proxy.hostEntityUuid,
      proxy.hostField,
    )

    const children = context.getProxiesForHost(
      proxy.block.entityType,
      proxy.block.uuid,
    )

    children.forEach((child) => {
      const childProxy = context.getProxy(child.block.uuid)
      if (childProxy) {
        const newChildUuid = this.getUuidForNewEntity(child.block.uuid)
        const clonedChild = entityStorageManager.cloneBlock(
          child.block,
          newChildUuid,
        ) as Block
        const clonedChildProxy = new BlockProxy(
          clonedChild,
          childProxy.block.entityType,
          newUuid,
          childProxy.hostField,
        )
        context.appendProxy(clonedChildProxy)
      }
    })

    context.addProxy(cloneProxy, preceedingUuid || proxy.block.uuid)
    return cloneProxy
  }
}
