import type { BlokkliMutatedField, BlokkliMutationItem } from '#blokkli/types'
import { Mutation } from '../plugins/mutations/Mutation'
import { mapMockField } from '../state'
import type { Block } from './Block'
import type { Entity } from './Entity'

export class BlockProxy {
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  block: Block
  isDeleted = false

  constructor(
    block: Block,
    hostEntityType: string,
    hostEntityUuid: string,
    hostField: string,
  ) {
    this.block = block
    this.hostEntityType = hostEntityType
    this.hostEntityUuid = hostEntityUuid
    this.hostField = hostField
  }

  static fromEntity(block: Block, hostField: string, entity: Entity) {
    return new BlockProxy(block, entity.entityType, entity.uuid, hostField)
  }

  markAsDeleted() {
    this.isDeleted = true
  }

  getFieldListKey() {
    return [this.hostEntityType, this.hostEntityUuid, this.hostField].join(':')
  }
}

export class MutationContext {
  proxies: BlockProxy[] = []

  constructor(hostEntity: Entity) {
    const createProxies = (entity: Entity) => {
      entity.getBlockFields().forEach((field) => {
        field.getBlocks().forEach((block) => {
          this.proxies.push(BlockProxy.fromEntity(block, field.id, entity))
          createProxies(block)
        })
      })
    }

    createProxies(hostEntity)
  }

  getProxy(uuid: string): BlockProxy | undefined {
    return this.proxies.find((v) => v.block.uuid === uuid)
  }

  getIndex(uuid: string): number | undefined {
    const index = this.proxies.findIndex((proxy) => proxy.block.uuid === uuid)
    if (index === -1) {
      return
    }
    return index
  }

  addProxy(proxy: BlockProxy, preceedingUuid?: string) {
    const index = preceedingUuid ? this.getIndex(preceedingUuid) : undefined

    if (index === undefined) {
      this.proxies.unshift(proxy)
    } else {
      this.proxies.splice(index, 0, proxy)
    }
  }
  appendProxy(proxy: BlockProxy) {
    this.proxies.push(proxy)
  }

  removeProxy(uuid: string): BlockProxy | undefined {
    const proxy = this.getProxy(uuid)
    if (proxy) {
      this.proxies = this.proxies.filter((v) => v.block.uuid !== uuid)
    }

    return proxy
  }

  moveProxyAfter(uuid: string, preceedingUuid: string) {
    const index = this.getIndex(uuid)
    const preceedingIndex = this.getIndex(preceedingUuid)

    const targetIndex =
      index !== undefined && preceedingIndex !== undefined
        ? index > preceedingIndex
          ? preceedingIndex + 1
          : preceedingIndex
        : 0

    const proxy = this.removeProxy(uuid)
    if (proxy) {
      this.proxies.splice(targetIndex, 0, proxy)
    }
  }

  getProxiesForHost(
    hostEntityType: string,
    hostEntityUuid: string,
  ): BlockProxy[] {
    return this.proxies.filter((proxy) => {
      return (
        proxy.hostEntityUuid === hostEntityUuid &&
        proxy.hostEntityType === hostEntityType
      )
    })
  }
}

type MutationItem = {
  id: string
  args: Record<string, any>
  configuration?: Record<string, any>
}

export type MutatedState = {
  mutatedOptions: any
  fields: BlokkliMutatedField[]
}

export class EditState {
  uuid: string
  mutations: MutationItem[] = []
  currentIndex = -1

  constructor(uuid: string) {
    this.uuid = uuid
  }

  setMutations(mutations: MutationItem[]) {
    this.mutations = mutations
  }

  addMutation(id: string, args: any) {
    this.mutations.push({ id, args })
  }

  getMutationItems(): BlokkliMutationItem[] {
    return this.mutations.map((v) => {
      return {
        pluginId: v.id,
        plugin: {
          label: v.id,
        },
      }
    })
  }

  getMutatedState(entity: Entity) {
    const context = new MutationContext(entity)

    this.mutations.forEach((item) => {
      const plugin = Mutation.create(item.id, item.configuration)
      plugin.execute(context, item.configuration)
      item.configuration = plugin.configuration
    })

    const mutatedOptions: Record<string, any> = {}
    const proxiesByFieldKey: Record<string, BlockProxy[]> = {}
    context.proxies.forEach((proxy) => {
      mutatedOptions[proxy.block.uuid] = proxy.block.options().getOptions()
      const key = proxy.getFieldListKey()
      if (!proxiesByFieldKey[key]) {
        proxiesByFieldKey[key] = []
      }
      proxiesByFieldKey[key].push(proxy)
    })

    const blockFields = entity.getBlockFields()

    blockFields.forEach((field) => {
      field.list = []
      const key = field.getFieldListKey()
      const proxies = proxiesByFieldKey[key] || []
      proxies.forEach((proxy) => {
        field.append(proxy.block)
      })
    })

    return {
      mutatedOptions,
      mutatedFields: blockFields.map((field) => {
        return {
          name: field.id,
          label: field.label,
          field: {
            list: mapMockField(field).list,
          },
        }
      }),
    }
  }
}
