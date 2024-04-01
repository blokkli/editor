import { createBlock } from './state/Block'
import type { Block } from './state/Block/Block'
import { Comment } from './state/Comment'
import type { Entity } from './state/Entity'
import { ContentPage, type Content } from './state/Entity/Content'
import { LibraryItem } from './state/LibraryItem'
import { MediaImage, type Media, MediaVideo } from './state/Media/Media'
import { User } from './state/User'
import data from './../../snapshots/data.json'
import videosData from './../../snapshots/videos.json'
import type { FieldBlocks } from './state/Field/Blocks'
import { generateUUID } from './uuid'

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

  query<K extends T>(conditions: Record<string, string>): K[] {
    return Object.values(this.entities).filter((entity) => {
      return Object.entries(conditions).every(([fieldName, value]) => {
        if (fieldName === 'bundle') {
          return entity.bundle === value
        }
        const field = entity.get(fieldName)
        return field.list.includes(value)
      })
    }) as K[]
  }

  add(entity: T) {
    this.entities[entity.uuid] = entity
  }

  delete(uuid: string) {
    const entity = this.entities[uuid]
    if (entity) {
      delete this.entities[uuid]
    }
  }
}

type StorageMap = {
  content: EntityStorage<Content>
  comment: EntityStorage<Comment>
  user: EntityStorage<User>
  block: EntityStorage<Block>
  media: EntityStorage<Media>
  library_item: EntityStorage<LibraryItem>
}

export type ValidStorageKey = keyof StorageMap

export class EntityStorageManager {
  storages: StorageMap

  constructor() {
    this.storages = {
      content: new EntityStorage(),
      comment: new EntityStorage(),
      user: new EntityStorage(),
      block: new EntityStorage(),
      media: new EntityStorage(),
      library_item: new EntityStorage(),
    }

    this.createImage('1', '/search.png', 'Search functionality in Blokkli')

    this.createImage(
      '2',
      '/code.png',
      'Vue Component of a Blokkli Block with a very long title to test how it renders in the media library grid',
      'code.png',
    )

    this.createImage(
      '3',
      '/editor-screenshot.png',
      'editor_screenshot_with_a_very_weird_title_that_should_actually_not_be_a_file-name.png',
      'editor_screenshot_with_a_very_weird_title_that_should_actually_not_be_a_file-name.png',
    )

    this.createImage(
      '4',
      '/toolbar.png',
      'Vue Component of a Blokkli Block',
      'toolbar.png',
    )

    this.createImage('5', '/drupal-logo.svg', 'Drupal Logo', 'drupal-logo.svg')
    this.createImage(
      '6',
      '/basel-logo.svg',
      'Logo of the canton of Basel-Stadt',
      'basel-logo.svg',
    )

    this.createImage('7', '/placeholder.jpg', 'Placeholder', 'placeholder.jpg')
    this.createImage(
      '8',
      '/mobile-screenshot.png',
      'Mobile Screenshot',
      'mobile-screenshot.png',
    )

    this.addUser('1', 'John Miller', 'john@example.com')
    this.addUser('2', 'Martin Faux', 'martin@example.com')

    this.addComment({
      body: 'This is very nice!',
      isResolved: true,
      parentEntityType: 'content',
      created: new Date(2023, 11, 4, 13, 2).getTime(),
      parentEntityUuid: '1',
      referencedBlocks: ['18a7ed49-7355-4d0d-9004-6623c98a999f'],
      user: '1',
    })

    this.addComment({
      body: 'We should probably link to the code in the repo for the adapter.',
      isResolved: false,
      parentEntityType: 'content',
      created: new Date(2023, 11, 4, 11, 2).getTime(),
      parentEntityUuid: '1',
      referencedBlocks: ['c414a773-406c-4200-aef6-ada9349b3f11'],
      user: '1',
    })

    const page = new ContentPage('1')
    page.title().setText('Interactive $page building$ experience for Nuxt.')
    page
      .lead()
      .setText(
        'Simple content pages or complex landing pages. blökkli provides a solid modular framework to build your own editing experience - with any backend.',
      )

    page.addTranslation('de', {
      title: ['Interaktiver $Page Builder$ für Nuxt'],
    })
    this.storages.content.add(page)

    const cypressPage = new ContentPage('2')
    cypressPage.title().setText('Interactive $page building$ cypress test.')
    cypressPage.lead().setText('Test page for cypress tests.')
    this.storages.content.add(cypressPage)

    const usedBlocks: string[] = []

    data.fields.forEach((item) => {
      usedBlocks.push(...item.field)
    })

    data.blocks.forEach((item) => {
      this.createBlock(item.bundle, item.uuid, item.values)
    })

    const added: string[] = []

    data.fields.forEach((item) => {
      const entity = this.load(item.entityType as any, item.entityUuid)
      if (entity) {
        const field = entity.get<FieldBlocks>(item.name)
        field.setList()
        if (field) {
          item.field.forEach((uuid) => {
            if (!added.includes(uuid)) {
              field.append(uuid)
              added.push(uuid)
            }
          })
        }
      }
    })

    data.libraryItems.forEach((item) => {
      const libraryItem = new LibraryItem(item.uuid)
      libraryItem.setValues({
        title: item.title,
      })
      libraryItem.getBlocks().setList([item.block])
      this.addLibraryItem(libraryItem)
    })

    videosData.forEach((item, i) => {
      this.createVideo((i + 100).toString(), item.url, item.title)
    })

    const stressTestPage = new ContentPage('3')
    stressTestPage.title().setText('A $stress test$ page with lots of blocks.')
    stressTestPage.lead().setText('Will it crash?')

    const stressUuids: string[] = []
    let counter = 0
    for (let i = 0; i < 100; i++) {
      const cardUuids: string[] = []
      for (let j = 0; j < 3; j++) {
        const cardUuid = 'stress-test-card-' + counter
        this.createBlock('card', cardUuid, {
          title: 'Card ' + counter,
          text: 'This is the text of card number ' + counter,
        })
        counter++
        cardUuids.push(cardUuid)
      }
      const imageUuid = 'stress-test-image-' + counter
      this.createBlock('image', imageUuid, {
        imageReference: ['7'],
      })
      counter++
      cardUuids.push(imageUuid)
      const gridUuid = 'stress-test-grid-' + i
      const block = this.createBlock('grid', gridUuid)
      block.get('blocks').setList(cardUuids)

      const titleUuid = 'stress-test-title-' + i
      this.createBlock('title', titleUuid, {
        title: 'Title ' + i,
        tagline: 'Tagline ' + i,
        lead: 'This is the text of title number ' + i,
      })
      block.get('header').setList([titleUuid])
      stressUuids.push(gridUuid)
    }
    stressTestPage.get('content').setList(stressUuids)
    this.storages.content.add(stressTestPage)
  }

  getUser(uuid: string): User | undefined {
    return this.storages.user.load(uuid)
  }

  addUser(uuid: string, name: string, email: string) {
    const user = new User(uuid)
    user.setValues({
      name,
      email,
    })
    this.storages.user.add(user)
  }

  getContent(uuid: string): Content | undefined {
    const entity = this.storages.content.load(uuid)
    if (!entity) {
      return
    }
    const values = entity.getValues()
    const clone = new ContentPage(uuid)
    clone.setValues(values)
    return clone
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

  addComment(values: Record<string, any> = {}, uuid?: string): Comment {
    const comment = new Comment(uuid || generateUUID())
    comment.setValues(values)
    this.storages.comment.add(comment)
    return comment
  }

  addBlock(block: Block) {
    this.storages.block.add(block)
  }

  addLibraryItem(item: LibraryItem) {
    this.storages.library_item.add(item)
  }

  createBlock(bundle: string, uuid: string, values: Record<string, any> = {}) {
    const block = createBlock(bundle, uuid)
    block.setValues(values)
    this.storages.block.add(block)
    return block
  }

  createImage(uuid: string, url: string, alt: string, filename?: string) {
    const image = new MediaImage(uuid)
    image.setValues({
      url,
      alt,
      filename,
    })
    this.storages.media.add(image)
  }

  createVideo(uuid: string, url: string, title: string) {
    const video = new MediaVideo(uuid)
    video.setValues({
      url,
      title,
    })
    this.storages.media.add(video)
    return video
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

const entityStorageManager = new EntityStorageManager()

export { entityStorageManager }
