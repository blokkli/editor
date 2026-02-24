import { createParagraph } from './state/Paragraph'
import type { Paragraph } from './state/Paragraph/Paragraph'
import { Comment } from './state/Comment'
import type { Entity } from './state/Entity'
import { ContentPage, type Content } from './state/Entity/Content'
import { LibraryItem } from './state/LibraryItem'
import { TemplateItem } from './state/TemplateItem'
import { MediaImage, type Media, MediaVideo } from './state/Media/Media'
import { User } from './state/User'
import data from './../../snapshots/data.json'
import videosData from './../../snapshots/videos.json'
import type { FieldBlocks } from './state/Field/Blocks'
// import { icons } from '#blokkli-build/icons'
import { generateUUID } from './uuid'
import * as commentStorage from './commentStorage'
import type { StoredComment } from './commentStorage'

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
      // oxlint-disable-next-line
      delete this.entities[uuid]
    }
  }
}

type StorageMap = {
  content: EntityStorage<Content>
  comment: EntityStorage<Comment>
  user: EntityStorage<User>
  paragraph: EntityStorage<Paragraph>
  media: EntityStorage<Media>
  library_item: EntityStorage<LibraryItem>
  template_item: EntityStorage<TemplateItem>
}

export type ValidStorageKey = keyof StorageMap

export class EntityStorageManager {
  storages: StorageMap

  constructor() {
    this.storages = {
      content: new EntityStorage(),
      comment: new EntityStorage(),
      user: new EntityStorage(),
      paragraph: new EntityStorage(),
      media: new EntityStorage(),
      library_item: new EntityStorage(),
      template_item: new EntityStorage(),
    }

    // Object.entries(icons).forEach(([name, markup]) => {
    //   const uuid = name
    //   const icon = new MediaIcon(uuid)
    //   icon.setValues({
    //     name,
    //     markup,
    //   })
    //   this.storages.media.add(icon)
    // })

    this.createImage(
      '1',
      '/search.png',
      'Search functionality in Blokkli',
      'search.png',
      1703,
      1290,
    )

    this.createImage(
      '2',
      '/code.png',
      'Vue Component of a Blokkli Block with a very long title to test how it renders in the media library grid',
      'code.png',
      800,
      752,
    )

    this.createImage(
      '3',
      '/editor-screenshot.png',
      'editor_screenshot_with_a_very_weird_title_that_should_actually_not_be_a_file-name.png',
      'editor_screenshot_with_a_very_weird_title_that_should_actually_not_be_a_file-name.png',
      2880,
      1760,
    )

    this.createImage(
      '4',
      '/toolbar.png',
      'Vue Component of a Blokkli Block',
      'toolbar.png',
      3642,
      200,
    )

    this.createImage(
      '5',
      '/drupal-logo.svg',
      'Drupal Logo',
      'drupal-logo.svg',
      380,
      370,
    )
    this.createImage(
      '6',
      '/basel-logo.svg',
      'Logo of the canton of Basel-Stadt',
      'basel-logo.svg',
      380,
      370,
    )

    this.createImage(
      '7',
      '/placeholder.jpg',
      'Placeholder',
      'placeholder.jpg',
      1220,
      915,
    )
    this.createImage(
      '8',
      '/mobile-screenshot.png',
      'Mobile Screenshot',
      'mobile-screenshot.png',
      750,
      1400,
    )

    this.addUser('1', 'John Miller', 'john@example.com')
    this.addUser('2', 'Martin Faux', 'martin@example.com')

    // Load comments from localStorage (will initialize with defaults if empty)
    this.loadCommentsFromStorage()

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
      if (
        item.bundle !== 'not_implemented' ||
        import.meta.dev ||
        import.meta.test
      ) {
        this.createBlock(item.bundle, item.uuid, item.values)
      }
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

    if (import.meta.dev) {
      const devTextUuid = 'dev-long-text-block'
      this.createBlock('text', devTextUuid, {
        text: '<h2>Why blökkli?</h2><p>Most page builders force you into their ecosystem. They dictate how your data is stored, how your components are structured, and how your backend works. blökkli takes a fundamentally different approach: it is purely an editor. It provides the interactive editing experience — drag and drop, inline editing, real-time previews — while your backend remains in full control of the data. This separation means you can integrate blökkli into an existing Nuxt project without rewriting your content model or migrating your database.</p><p>The adapter pattern is at the heart of this architecture. Every mutation — adding a block, moving it, changing an option, deleting it — is delegated to an adapter that you implement. The adapter defines how these operations translate to your backend, whether that is Drupal with Paragraphs, a headless CMS, a custom API, or even localStorage. blökkli ships with a full Drupal adapter as a reference implementation, but the interface is designed to be backend-agnostic. If your backend can handle CRUD operations on structured content, you can write an adapter for it.</p><p>On the frontend, blökkli builds on Vue and Nuxt. Blocks are regular Vue single-file components that use the <code>defineBlokkli()</code> composable to declare their bundle, options, and editor behavior. A Vite plugin extracts these definitions at build time and generates TypeScript types, so your block options, field lists, and bundle names are fully type-safe. There is no runtime schema parsing or magic strings — everything is checked at compile time. This means refactoring a block option or renaming a field will surface errors immediately, not in production.</p><p>The feature system makes the editor modular. Each piece of editor functionality — comments, history, clipboard, search, validation, the AI assistant — is a self-contained feature that is discovered at build time by the FeatureCollector. Features can be enabled or disabled per project, and they communicate through a well-defined event bus and provider system. This keeps the core small while allowing ambitious extensions. The AI agent module, for example, adds a full conversational assistant to the editor sidebar without touching a single line of core editor code.</p><p>Performance was a priority from the start. blökkli uses a custom animation system, intelligent DOM diffing for live previews, and code splitting so that features are only loaded when needed. The editor overlay is rendered in a separate layer that does not interfere with your page styles. Even on pages with hundreds of blocks, the editing experience stays responsive. The playground in this repository demonstrates this — you can open the stress test page with 1500+ blocks and see for yourself.</p>',
      })
      const contentEntity = this.load('content', '1')
      if (contentEntity) {
        contentEntity.get<FieldBlocks>('content').append(devTextUuid)
      }
    }

    data.libraryItems.forEach((item) => {
      const libraryItem = new LibraryItem(item.uuid)
      libraryItem.setValues({
        title: item.title,
      })
      libraryItem.getBlocks().setList([item.block])
      this.addLibraryItem(libraryItem)
    })

    // Load template items
    if ('templateItems' in data && Array.isArray(data.templateItems)) {
      data.templateItems.forEach((item: any) => {
        const templateItem = new TemplateItem(item.uuid)
        templateItem.setValues({
          title: item.title,
          description: item.description || '',
          isDefault: item.isDefault || false,
        })
        templateItem.getBlocks().setList(item.blocks || [])
        this.addTemplateItem(templateItem)
      })
    }

    videosData.forEach((item, i) => {
      this.createVideo((i + 100).toString(), item.url, item.title)
    })

    const stressTestPage = new ContentPage('3')
    stressTestPage.title().setText('A $stress test$ page with lots of blocks.')
    stressTestPage.lead().setText('Will it crash?')

    const stressUuids: string[] = []
    let counter = 0
    for (let i = 0; i < 500; i++) {
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

  /**
   * Load comments from localStorage into the in-memory storage.
   */
  loadCommentsFromStorage() {
    const storedComments = commentStorage.loadComments()

    // Clear existing comments
    this.storages.comment = new EntityStorage()

    // Load each stored comment into the storage
    storedComments.forEach((stored) => {
      const comment = new Comment(stored.uuid)
      comment.setValues({
        body: stored.body,
        isResolved: stored.isResolved,
        parentEntityType: stored.parentEntityType,
        parentEntityUuid: stored.parentEntityUuid,
        created: stored.created,
        user: stored.user,
        referencedBlocks: stored.referencedBlocks,
      })
      this.storages.comment.add(comment)
    })
  }

  getCommentsForPage(uuid: string): Comment[] {
    // Reload from localStorage to ensure we have the latest data
    this.loadCommentsFromStorage()

    return this.storages.comment.query({
      parentEntityType: 'content',
      parentEntityUuid: uuid,
    })
  }

  addComment(values: Record<string, any> = {}, uuid?: string): Comment {
    const commentUuid = uuid || generateUUID()
    const comment = new Comment(commentUuid)
    comment.setValues(values)
    this.storages.comment.add(comment)

    // Persist to localStorage
    const storedComment: StoredComment = {
      uuid: commentUuid,
      body: values.body || '',
      isResolved: values.isResolved || false,
      parentEntityType: values.parentEntityType || '',
      parentEntityUuid: values.parentEntityUuid || '',
      created: values.created || Date.now(),
      user: values.user || '1',
      referencedBlocks: values.referencedBlocks || [],
    }
    commentStorage.addComment(storedComment)

    return comment
  }

  resolveComment(uuid: string) {
    // Update in localStorage
    commentStorage.resolveComment(uuid)

    // Reload from localStorage to update in-memory state
    this.loadCommentsFromStorage()
  }

  addBlock(block: Paragraph) {
    this.storages.paragraph.add(block)
  }

  addLibraryItem(item: LibraryItem) {
    this.storages.library_item.add(item)
  }

  addTemplateItem(item: TemplateItem) {
    this.storages.template_item.add(item)
  }

  createBlock(bundle: string, uuid: string, values: Record<string, any> = {}) {
    const block = createParagraph(bundle, uuid)
    block.setValues(values)
    this.storages.paragraph.add(block)
    return block
  }

  createImage(
    uuid: string,
    url: string,
    alt: string,
    filename: string,
    width: number,
    height: number,
  ) {
    const image = new MediaImage(uuid)
    image.setValues({
      url,
      alt,
      filename,
      width: width.toString(),
      height: height.toString(),
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

  cloneBlock(entity: Paragraph, newUuid: string): Entity {
    // Create a new instance of the current class
    const cloned = new (entity.constructor as typeof Entity)(
      newUuid,
    ) as Paragraph

    const values = entity.getValues()
    cloned.setValues({ ...values, isNew: [true] })
    this.addBlock(cloned)

    return cloned
  }

  load(entityType: keyof StorageMap, uuid: string) {
    return this.storages[entityType].load(uuid)
  }
}

const entityStorageManager = new EntityStorageManager()

export { entityStorageManager }
