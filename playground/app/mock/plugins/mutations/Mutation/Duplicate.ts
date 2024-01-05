import { falsy } from '#blokkli/helpers'
import { entityStorageManager } from '~/app/mock/entityStorage'
import type { Block } from '../../../state/Block/Block'
import { BlockProxy, MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationDuplicateArgs = {
  uuids: string[]
  hostEntityType?: string
  hostEntityUuid?: string
  hostField?: string
  preceedingUuid?: string
}

export class MutationDuplicate extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('duplicate', configuration)
  }

  getAffectedUuid(args: MutationDuplicateArgs): string | undefined {
    return args.uuids[0]
  }

  execute(context: MutationContext, args: MutationDuplicateArgs) {
    const sorted = args.uuids
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
      .sort((a, b) => a.index - b.index)
    let preceedingUuid = args.preceedingUuid || sorted[sorted.length - 1].uuid

    sorted.forEach((v) => {
      const proxy = context.getProxy(v.uuid)
      if (proxy) {
        const clone = this.duplicateProxy(
          context,
          proxy,
          args.hostEntityType || proxy.hostEntityType,
          args.hostEntityUuid || proxy.hostEntityUuid,
          args.hostField || proxy.hostField,
          preceedingUuid,
        )
        preceedingUuid = clone.block.uuid
      }
    })
  }

  duplicateProxy(
    context: MutationContext,
    proxy: BlockProxy,
    hostEntityType: string,
    hostEntityUuid: string,
    hostField: string,
    preceedingUuid?: string,
  ): BlockProxy {
    const block = proxy.block
    const newUuid = this.getUuidForNewEntity(block.uuid)
    const clone = entityStorageManager.cloneBlock(block, newUuid) as Block
    const cloneProxy = new BlockProxy(
      clone,
      hostEntityType,
      hostEntityUuid,
      hostField,
    )

    cloneProxy.overrideOptions = { ...proxy.overrideOptions }

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
        clonedChildProxy.overrideOptions = { ...childProxy.overrideOptions }
        context.appendProxy(clonedChildProxy)
      }
    })

    context.addProxy(cloneProxy, preceedingUuid || proxy.block.uuid)
    return cloneProxy
  }
}
