import { falsy } from '#blokkli/helpers'
import { Block } from '../../state/Block'
import { BlockProxy, type MutationContext } from '../../state/EditState'
import { Plugin } from '../Plugin'

export class Mutation extends Plugin {
  id: string

  constructor(id: string, configuration?: Record<string, any>) {
    super('mutation')
    this.id = id
    if (configuration) {
      this.configuration = configuration
    }
  }

  static create(id: string, configuration?: Record<string, any>): Mutation {
    switch (id) {
      case 'add':
        return new MutationAdd(configuration)
      case 'delete':
        return new MutationDelete(configuration)
      case 'move':
        return new MutationMove(configuration)
      case 'duplicate':
        return new MutationDuplicate(configuration)
    }

    throw new Error('Missing mutation plugin with ID: ' + id)
  }

  getUuidForNewEntity(prefix = 'default'): string {
    const key = 'new_uuid_' + prefix
    if (this.configuration[key]) {
      return this.configuration[key]
    }

    const uuid = crypto.randomUUID()
    this.configuration[key] = uuid
    return uuid
  }

  execute(context: MutationContext, args: any) {}
}

type MutationAddArgs = {
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

    const block = Block.create(args.bundle, uuid)
    Object.entries(args.values).forEach(([key, value]) => {
      block.get(key).list = value
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

type MutationDeleteArgs = {
  uuids: string[]
}

export class MutationDelete extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('delete', configuration)
  }

  execute(context: MutationContext, args: MutationDeleteArgs) {
    args.uuids.forEach((uuid) => {
      const proxy = context.getProxy(uuid)
      if (proxy) {
        proxy.markAsDeleted()
      }
    })
  }
}

type MutationMoveArgs = {
  uuids: string[]
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string
}

export class MutationMove extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('move', configuration)
  }

  execute(context: MutationContext, args: MutationMoveArgs) {
    const proxies = args.uuids
      .map((uuid) => {
        const proxy = context.getProxy(uuid)
        const index = context.getIndex(uuid)
        if (index !== undefined && proxy) {
          return { proxy, index }
        }
      })
      .filter(falsy)
      .sort((a, b) => b.index - a.index)
      .map((v) => v.proxy)

    let after = args.preceedingUuid

    proxies.forEach((proxy) => {
      proxy.hostEntityType = args.hostEntityType
      proxy.hostEntityUuid = args.hostEntityUuid
      proxy.hostField = args.hostField
      if (after) {
        context.moveProxyAfter(proxy.block.uuid, after)
      } else {
        context.addProxy(proxy)
      }
      after = proxy.block.uuid
    })
  }
}

type MutationDuplicateArgs = {
  uuids: string[]
}

export class MutationDuplicate extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('duplicate', configuration)
  }

  execute(context: MutationContext, args: MutationDeleteArgs) {
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
    const clone = block.clone(newUuid) as Block

    const children = context.getProxiesForHost(
      proxy.block.entityType,
      proxy.block.uuid,
    )

    children.forEach((child) => {
      const childProxy = context.getProxy(child.block.uuid)
      if (childProxy) {
        const newChildUuid = this.getUuidForNewEntity(child.block.uuid)
        const clonedChild = child.block.clone(newChildUuid) as Block
        const clonedChildProxy = new BlockProxy(
          clonedChild,
          childProxy.hostEntityType,
          childProxy.hostEntityUuid,
          childProxy.hostField,
        )
        context.appendProxy(clonedChildProxy)
      }
    })

    const cloneProxy = new BlockProxy(
      clone,
      proxy.hostEntityType,
      proxy.hostEntityUuid,
      proxy.hostField,
    )
    context.addProxy(cloneProxy, preceedingUuid || proxy.block.uuid)
    return cloneProxy
  }
}
