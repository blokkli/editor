import type { BlokkliMutatedField, BlokkliMutationItem } from '#blokkli/types'
import { createMutation, type MutationArgsMap } from '../plugins/mutations'
import { mapMockField } from '../state'
import type { Block } from './Block/Block'
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

  moveProxyAfter(uuid: string, preceedingUuid?: string) {
    const index = this.getIndex(uuid)
    const preceedingIndex = preceedingUuid
      ? this.getIndex(preceedingUuid)
      : undefined

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
  timestamp: number
}

export type MutatedState = {
  mutatedOptions: any
  fields: BlokkliMutatedField[]
  context: MutationContext
}

export class EditState {
  uuid: string

  constructor(uuid: string) {
    this.uuid = uuid
  }

  getStorageKey(suffix: string) {
    return 'blokkli_mock_' + this.uuid + '_' + suffix
  }

  get currentIndex(): number {
    try {
      const data = window.localStorage.getItem(this.getStorageKey('index'))
      if (data !== null) {
        const v = parseInt(data)
        if (!isNaN(v)) {
          return v
        }
      }
    } catch (_e) {
      // Noop.
    }

    return -1
  }

  set currentIndex(v: number) {
    window.localStorage.setItem(this.getStorageKey('index'), v.toString())
  }

  getMutations(): MutationItem[] {
    try {
      const data = window.localStorage.getItem(this.getStorageKey('mutations'))
      if (data) {
        const parsed = JSON.parse(data)
        if (parsed && Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (_e) {
      // Noop.
    }

    return []
  }

  revert() {
    window.localStorage.removeItem(this.getStorageKey('mutations'))
    window.localStorage.removeItem(this.getStorageKey('index'))
  }

  addMutation<T extends keyof MutationArgsMap>(
    id: T,
    args: MutationArgsMap[T],
  ) {
    let mutations = this.getMutations()
    if (this.currentIndex !== mutations.length - 1) {
      mutations = mutations.slice(0, this.currentIndex + 1)
    }
    mutations.push({ id, args, timestamp: Date.now() })
    this.currentIndex = this.currentIndex + 1
    this.persistMutations(mutations)
  }

  persistMutations(mutations: MutationItem[]) {
    const data = JSON.stringify(mutations)
    window.localStorage.setItem(this.getStorageKey('mutations'), data)
  }

  getMutationItems(): BlokkliMutationItem[] {
    return this.getMutations().map((v) => {
      return {
        pluginId: v.id,
        timestamp: (v.timestamp / 1000).toString(),
        plugin: {
          label: v.id,
        },
      }
    })
  }

  getMutatedState(entity: Entity): MutatedState {
    const context = new MutationContext(entity)

    const mutations = this.getMutations()
    const currentIndex = this.currentIndex
    for (let i = 0; i <= currentIndex; i++) {
      const item = mutations[i]
      if (item) {
        const plugin = createMutation(item.id as any, item.configuration)
        plugin.execute(context, item.args)
        mutations[i].configuration = plugin.configuration
      }
    }

    this.persistMutations(mutations)

    const mutatedOptions: Record<string, any> = {}
    const proxiesByFieldKey: Record<string, BlockProxy[]> = {}
    context.proxies.forEach((proxy) => {
      if (!proxy.isDeleted) {
        mutatedOptions[proxy.block.uuid] = proxy.block.options().getOptions()
      }
      const key = proxy.getFieldListKey()
      if (!proxiesByFieldKey[key]) {
        proxiesByFieldKey[key] = []
      }
      proxiesByFieldKey[key].push(proxy)
    })

    const blockFields = entity.getBlockFields()

    blockFields.forEach((field) => {
      field.setList([])
      const key = field.getFieldListKey()
      const proxies = proxiesByFieldKey[key] || []
      proxies.forEach((proxy) => {
        if (!proxy.isDeleted) {
          field.append(proxy.block)
        }
        const nestedBlockFields = proxy.block.getBlockFields()
        nestedBlockFields.forEach((nestedField) => {
          const nestedProxies =
            proxiesByFieldKey[nestedField.getFieldListKey()] || []
          nestedField.setList(
            nestedProxies.filter((v) => !v.isDeleted).map((v) => v.block),
          )
        })
      })
    })

    return {
      mutatedOptions,
      fields: blockFields.map((field) => {
        return {
          name: field.id,
          label: field.label,
          field: {
            list: mapMockField(field).list,
          },
        }
      }),
      context,
    }
  }
}
