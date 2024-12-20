import { falsy } from '#blokkli/helpers'
import type { MutatedField, MutationItem, Validation } from '#blokkli/types'
import { entityStorageManager } from '../entityStorage'
import { createMutation, type MutationArgsMap } from '../plugins/mutations'
import { mapBlockItem } from '../state'
import { createBlock } from './Block'
import type { Block } from './Block/Block'
import type { Entity } from './Entity'
import type { FieldBlocks } from './Field/Blocks'

export class BlockProxy {
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  block: Block
  isDeleted = false
  overrideOptions: Record<string, string>

  constructor(
    block: Block,
    hostEntityType: string,
    hostEntityUuid: string,
    hostField: string,
    overrideOptions: Record<string, string> = {},
  ) {
    this.block = block
    this.hostEntityType = hostEntityType
    this.hostEntityUuid = hostEntityUuid
    this.hostField = hostField
    this.overrideOptions = overrideOptions
  }

  static fromEntity(block: Block, hostField: string, entity: Entity) {
    const clone = createBlock(block.bundle, block.uuid)
    clone.setValues(block.getValues())
    return new BlockProxy(clone, entity.entityType, entity.uuid, hostField)
  }

  markAsDeleted() {
    this.isDeleted = true
  }

  getFieldListKey() {
    return [this.hostEntityType, this.hostEntityUuid, this.hostField].join(':')
  }

  setOptionOverride(key: string, value: string) {
    this.overrideOptions[key] = value
  }
}

export class MutationContext {
  proxies: BlockProxy[] = []
  entity: Entity

  constructor(hostEntity: Entity) {
    this.entity = hostEntity
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
    const proxy = this.proxies.find((v) => v.block.uuid === uuid)
    if (proxy) {
      return proxy
    }
    const block = entityStorageManager.storages.block.load(uuid)
    if (block) {
      const newProxy = new BlockProxy(block, 'content', '1', 'content')
      this.proxies.push(newProxy)
      return newProxy
    }
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
      this.proxies.splice(index + 1, 0, proxy)
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

  getProxies(uuids: string[]): BlockProxy[] {
    return uuids
      .map((uuid) => {
        const proxy = this.getProxy(uuid)
        const index = this.getIndex(uuid)
        if (proxy && index !== undefined) {
          return {
            proxy,
            index,
          }
        }
      })
      .filter(falsy)
      .sort((a, b) => a.index - b.index)
      .map((v) => v.proxy)
  }
}

type MockMutationItem = {
  id: string
  args: Record<string, any>
  configuration?: Record<string, any>
  timestamp: number
}

export type MutatedState = {
  mutatedOptions: any
  fields: MutatedField[]
  context: MutationContext
  violations: Validation[]
}

export class EditState {
  uuid: string

  constructor(uuid: string) {
    this.uuid = uuid
  }

  getStorageKey(suffix: string) {
    return '__29_blokkli_mock_' + this.uuid + '_' + suffix
  }

  get currentIndex(): number {
    try {
      const data = window.localStorage.getItem(this.getStorageKey('index'))
      if (data !== null) {
        const v = Number.parseInt(data)
        if (!Number.isNaN(v)) {
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

  getMutations(): MockMutationItem[] {
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

  persistMutations(mutations: MockMutationItem[]) {
    const data = JSON.stringify(mutations)
    window.localStorage.setItem(this.getStorageKey('mutations'), data)
  }

  getMutationItems(): MutationItem[] {
    return this.getMutations().map((v) => {
      const mutation = createMutation(v.id as any, v.configuration)
      return {
        pluginId: v.id,
        timestamp: (v.timestamp / 1000).toString(),
        plugin: {
          label: v.id,
          affectedItemUuid: mutation.getAffectedUuid(v.args),
        },
      }
    })
  }

  getMutatedState(
    entity: Entity,
    options?: { save?: boolean; index?: number },
  ): MutatedState {
    const langcode = entity.langcode
    const context = new MutationContext(entity)

    const mutations = this.getMutations()
    const currentIndex = options?.index || this.currentIndex
    for (let i = 0; i <= currentIndex; i++) {
      const item = mutations[i]
      if (item) {
        const plugin = createMutation(item.id as any, item.configuration)
        plugin.execute(context, item.args)
        mutations[i].configuration = plugin.configuration
      }
    }
    if (!options?.index) {
      this.persistMutations(mutations)
    }

    const violations: Validation[] = []

    const mutatedOptions: Record<string, any> = {}
    const proxiesByFieldKey: Record<string, BlockProxy[]> = {}
    context.proxies.forEach((proxy) => {
      if (!proxy.isDeleted) {
        proxy.block = proxy.block.getTranslation(langcode)
        mutatedOptions[proxy.block.uuid] = {
          ...proxy.block.options().getOptions(),
          ...JSON.parse(JSON.stringify(proxy.overrideOptions)),
        }
      } else {
        if (options?.save) {
          entityStorageManager.storages.block.delete(proxy.block.uuid)
        }
      }
      if (options?.save) {
        Object.entries(proxy.overrideOptions).forEach(([key, value]) => {
          proxy.block.options().setOptionValue(key, value)
        })
      }
      const key = proxy.getFieldListKey()
      if (!proxiesByFieldKey[key]) {
        proxiesByFieldKey[key] = []
      }
      proxiesByFieldKey[key].push(proxy)
    })

    const mutatedFields: Record<string, MutatedField> = {}

    entity.getBlockFields().forEach((field) => {
      const key = field.getFieldListKey()
      mutatedFields[key] = {
        name: field.id,
        entityType: entity.entityType,
        entityUuid: entity.uuid,
        list: [],
      }
    })

    for (let i = 0; i < context.proxies.length; i++) {
      const proxy = context.proxies[i]

      if (proxy.isDeleted) {
        continue
      }

      const key = proxy.getFieldListKey()
      if (!mutatedFields[key]) {
        mutatedFields[key] = {
          name: proxy.hostField,
          entityType: proxy.hostEntityType,
          entityUuid: proxy.hostEntityUuid,
          list: [],
        }
      }

      const blockValidations = proxy.block.validate().map((v) => {
        return {
          ...v,
          entityType: 'block',
          entityUuid: proxy.block.uuid,
        }
      })
      violations.push(...blockValidations)

      if (!proxy.isDeleted) {
        mutatedFields[key].list.push(
          mapBlockItem(proxy.block, proxy.overrideOptions),
        )
      }
    }

    return {
      mutatedOptions,
      fields: Object.values(mutatedFields),
      context,
      violations,
    }
  }
}
