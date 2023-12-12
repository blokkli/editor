import { createBlock } from './state/Block'
import type { Block } from './state/Block/Block'
import type { Comment } from './state/Comment'
import type { Entity } from './state/Entity'
import type { Content } from './state/Entity/Content'
import { MediaImage, type Media } from './state/Media/Media'
import type { User } from './state/User'

type StorageMap = {
  content: EntityStorage<Content>
  comment: EntityStorage<Comment>
  user: EntityStorage<User>
  block: EntityStorage<Block>
  media: EntityStorage<Media>
}

export type ValidStorageKey = keyof StorageMap

export class EntityStorage<T extends Entity> {
  private entities: Record<string, T>

  constructor() {
    this.entities = {}
  }

  load(uuid: string): T | undefined {
    return this.entities[uuid]
  }

  loadAll(): T[] {
    return Object.values(this.entities)
  }

  query(conditions: Record<string, string>): T[] {
    return Object.values(this.entities).filter((entity) => {
      return Object.entries(conditions).every(([fieldName, value]) => {
        if (fieldName === 'bundle') {
          return entity.bundle === value
        }
        const field = entity.get(fieldName)
        return field.list.includes(value)
      })
    })
  }

  add(entity: T) {
    this.entities[entity.uuid] = entity
  }
}

export class EntityStorageManager {
  storages: StorageMap

  constructor() {
    this.storages = {
      content: new EntityStorage(),
      comment: new EntityStorage(),
      user: new EntityStorage(),
      block: new EntityStorage(),
      media: new EntityStorage(),
    }
  }

  getUser(uuid: string): User | undefined {
    return this.storages.user.load(uuid)
  }

  getContent(uuid: string): Content | undefined {
    return this.storages.content.load(uuid)
  }

  getStorage<T extends keyof StorageMap>(key: T): StorageMap[T] {
    return this.storages[key]
  }

  getCommentsForPage(uuid: string): Comment[] {
    return this.storages.comment.query({
      parentEntityType: 'content',
      parentEntityUuid: uuid,
    })
  }

  addBlock(block: Block) {
    this.storages.block.add(block)
  }

  createBlock(bundle: string, uuid: string, values: Record<string, any> = {}) {
    const block = createBlock(bundle, uuid)
    block.setValues(values)
    this.storages.block.add(block)
    return block
  }

  createImage(uuid: string, url: string, alt: string) {
    const image = new MediaImage(uuid)
    image.setValues({
      url,
      alt,
    })
    this.storages.media.add(image)
  }

  cloneBlock(entity: Block, newUuid: string): Entity {
    // Create a new instance of the current class
    const cloned = new (entity.constructor as typeof Entity)(newUuid) as Block

    const values = entity.getValues()
    cloned.setValues(values)
    this.addBlock(cloned)

    return cloned
  }

  load(entityType: keyof StorageMap, uuid: string) {
    return this.storages[entityType].load(uuid)
  }
}

export const entityStorageManager = new EntityStorageManager()
