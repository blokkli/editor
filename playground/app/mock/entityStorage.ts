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
      lead: [
        'Einfache Inhaltsseiten oder komplexe Landing Pages. blökkli bietet ein modulares Framework für Ihre eigene Editing-Erfahrung – mit jedem Backend.',
      ],
    })
    page.addTranslation('fr', {
      title: ['Expérience de $construction de pages$ interactive pour Nuxt'],
      lead: [
        "Pages simples ou pages de destination complexes. blökkli offre un cadre modulaire pour votre propre expérience d'édition – avec n'importe quel backend.",
      ],
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

    // Add German translations for demo paragraphs.
    const deTranslations: Record<string, Record<string, string[]>> = {
      '4526d2d0-f122-4093-902f-e2f00a433981': {
        tagline: ['Entwickler-Erfahrung'],
        title: ['Integriert sich in jedes Nuxt-Setup'],
        lead: [
          'Blöcke werden mit minimalem Overhead gerendert. Volle SSR-Unterstützung, kein CSS-Leaking.',
        ],
      },
      '3284016a-aa33-4994-8e4d-c0a6f9bd91c7': {
        tagline: ['Einfachheit'],
        title: ['Wichtige Werkzeuge für nahtloses Editieren'],
        lead: [
          'Navigieren Sie die Grundlagen der Seitengestaltung mit unvergleichlicher Leichtigkeit.',
        ],
      },
      'a4aac285-9615-4764-81de-96d3af41e622': {
        title: ['Kopieren, Duplizieren, Bearbeiten, Löschen'],
        text: [
          'Führen Sie grundlegende Bearbeitungen schnell durch und verwalten Sie Ihre Inhalte effizient.',
        ],
      },
      '1645ba79-8770-4a0c-a58b-163a847eea22': {
        title: ['Auswählen'],
        text: [
          'Wählen Sie mehrere Blöcke mit Strg + Klick oder Drag-and-Drop aus.',
        ],
      },
      '27e417eb-a5fa-4d17-94b5-e218fc653906': {
        title: ['Verlauf'],
        text: [
          'Aktionen mühelos rückgängig machen oder wiederherstellen und den kompletten Bearbeitungsverlauf einsehen.',
        ],
      },
      'd6020cd0-45f0-4200-8690-e297a38a1cca': {
        tagline: ['Gestalten Sie Ihr Design'],
        title: ['Dynamische Optionen und interaktive Funktionen'],
        lead: [
          'Fügen Sie anpassbare Optionen und interaktive Funktionen zu Ihren Blöcken hinzu.',
        ],
      },
      '47f0bf41-bd49-47c2-a2c4-145f80abe161': {
        tagline: ['Multi Everything'],
        title: ['Mehrsprachigkeit und erweiterte Vorschau'],
        lead: [
          'blökkli überwindet Sprachbarrieren und bietet erweiterte Vorschauoptionen.',
        ],
      },
      '5780e657-2c02-45b2-bb92-1424a7a29fb8': {
        title: ['Mehrsprachig'],
        text: [
          'blökkli unterstützt einen mehrsprachigen Workflow. Beim Übersetzen kann die Struktur nicht verändert werden.',
        ],
      },
      '0962e858-fbf6-4f98-bf6f-f7813bd5f9be': {
        title: ['Live-Demo ausprobieren'],
      },
      '332bbf33-2368-4b56-8ae6-4855657bc5d4': {
        title: ['Modul ansehen'],
      },
    }

    for (const [uuid, values] of Object.entries(deTranslations)) {
      const block = this.storages.paragraph.load(uuid)
      if (block) {
        block.addTranslation('de', values)
      }
    }

    // Add French translations for demo paragraphs.
    const frTranslations: Record<string, Record<string, string[]>> = {
      '4526d2d0-f122-4093-902f-e2f00a433981': {
        tagline: ['Expérience développeur'],
        title: ["S'intègre dans n'importe quelle configuration Nuxt"],
        lead: [
          'Les blocs sont rendus avec un minimum de surcharge. Support SSR complet, pas de fuite CSS.',
        ],
      },
      '3284016a-aa33-4994-8e4d-c0a6f9bd91c7': {
        tagline: ['Simplicité'],
        title: ['Outils essentiels pour une édition fluide'],
        lead: [
          "Naviguez dans les bases de la construction de pages avec une facilité inégalée.",
        ],
      },
      'a4aac285-9615-4764-81de-96d3af41e622': {
        title: ['Copier, Dupliquer, Modifier, Supprimer'],
        text: [
          'Effectuez rapidement des modifications de base et gérez votre contenu efficacement.',
        ],
      },
      '1645ba79-8770-4a0c-a58b-163a847eea22': {
        title: ['Sélectionner'],
        text: [
          'Sélectionnez plusieurs blocs avec Ctrl + clic ou glisser-déposer.',
        ],
      },
      '27e417eb-a5fa-4d17-94b5-e218fc653906': {
        title: ['Historique'],
        text: [
          "Annulez ou rétablissez des actions sans effort et explorez l'historique complet de vos modifications.",
        ],
      },
      'd6020cd0-45f0-4200-8690-e297a38a1cca': {
        tagline: ['Personnalisez votre design'],
        title: ['Options dynamiques et fonctionnalités interactives'],
        lead: [
          'Ajoutez des options personnalisables et des fonctionnalités interactives à vos blocs.',
        ],
      },
      '47f0bf41-bd49-47c2-a2c4-145f80abe161': {
        tagline: ['Multi Everything'],
        title: ['Support multilingue et aperçu avancé'],
        lead: [
          "blökkli transcende les barrières linguistiques et offre des options d'aperçu avancées.",
        ],
      },
      '5780e657-2c02-45b2-bb92-1424a7a29fb8': {
        title: ['Multilingue'],
        text: [
          "blökkli supporte un flux de travail multilingue. Lors de la traduction, la structure ne peut pas être modifiée.",
        ],
      },
      '0962e858-fbf6-4f98-bf6f-f7813bd5f9be': {
        title: ['Essayer la démo en direct'],
      },
      '332bbf33-2368-4b56-8ae6-4855657bc5d4': {
        title: ['Voir le module'],
      },
    }

    for (const [uuid, values] of Object.entries(frTranslations)) {
      const block = this.storages.paragraph.load(uuid)
      if (block) {
        block.addTranslation('fr', values)
      }
    }

    if (import.meta.dev) {
      const devTextUuid = 'dev-long-text-block'
      this.createBlock('text', devTextUuid, {
        text:
          '<h2>Architectural Considerations Pertaining to the Implementational Paradigm</h2>' +
          '<p>It should be noted that the aforementioned considerations with respect to the implementation of the architectural paradigm that has been chosen for the purposes of enabling the facilitation of content editing capabilities within the context of modern web-based application development frameworks are -- notwithstanding the inherent complexities that are necessarily entailed by the utilization of such a comprehensively designed and meticulously engineered system -- fundamentally predicated upon the establishment of a separation of concerns that is achieved through the employment of an adapter-based architectural pattern which, it must be acknowledged, requires that the developer who is tasked with the responsibility of integrating the aforementioned system into their existing infrastructure possess a thorough and comprehensive understanding of the underlying mechanisms...</p>' +
          '<h3>Prerequisites for the Establishment of Backend Communication Protocols</h3>' +
          '<p>The communication protocols that have been established for the purpose of facilitating the bidirectional transmission of data between the frontend editing interface and the backend content management infrastructure are characterized by their utilization of a mutation-based paradigm -- wherein each and every modification that is initiated by the end user through their interaction with the graphical user interface is subsequently transformed into a discrete operation -- that is then delegated to the adapter implementation which bears the responsibility of translating the aforementioned operation into the appropriate backend-specific API calls...</p>' +
          '<h3>Enumeration of Supplementary Functionalities</h3>' +
          '<ul>' +
          '<li>The establishment and maintenance of a comprehensive real-time synchronization mechanism that facilitates the instantaneous propagation of modifications across all concurrently connected client instances through the utilization of WebSocket-based communication channels</li>' +
          '<li>The implementation of an undo/redo history stack that maintains a chronologically ordered sequence of all mutations that have been performed during the current editing session for the purpose of enabling the reversal of undesired modifications</li>' +
          '<li>The provisioning of an extensible plugin architecture that permits third-party developers to augment the core functionality through the registration of custom event handlers and UI components</li>' +
          '<li>The incorporation of an artificial intelligence agent subsystem that leverages large language model capabilities for the automated generation and transformation of textual content in accordance with user-specified parameters and constraints</li>' +
          '</ul>' +
          '<h3>Considerations Regarding the Optimization of Computational Performance Characteristics</h3>' +
          '<p>With regard to the optimization of the computational performance characteristics of the system -- it is imperative that one takes into consideration the fact that the rendering pipeline which is responsible for the visual representation of the content blocks within the editing interface has been specifically engineered to minimize the occurrence of unnecessary re-renders through the implementation of a sophisticated diffing algorithm that compares the virtual DOM representation of the current state with that of the previous state -- thereby ensuring that only those elements which have actually undergone modification are subjected to the computationally expensive process of DOM manipulation... which constitutes, it should be emphasized, a significant contributing factor to the maintenance of acceptable frame rates even in scenarios where the page contains an exceedingly large number of content blocks.</p>' +
          '<h2>Methodological Framework for the Configuration of the Development Environment</h2>' +
          '<p>The procedural methodology that must be adhered to for the purposes of establishing and configuring a development environment that is suitable for the implementation of custom block components and adapter integrations necessitates the sequential execution of a series of preliminary steps, the successful completion of which is contingent upon the prior installation of the requisite software dependencies, including but not limited to the Node.js runtime environment, the npm package manager, and the Vue.js framework, all of which must be present in versions that are compatible with the version constraints that have been specified in the package configuration manifest.</p>' +
          '<h3>Obligatory Procedural Steps</h3>' +
          '<ol>' +
          '<li>The initialization of the project workspace through the execution of the package manager installation command which triggers the resolution and retrieval of all transitive dependencies</li>' +
          '<li>The generation of the requisite TypeScript type definitions and build-time artifacts through the invocation of the development preparation script</li>' +
          '<li>The instantiation of the development server process which establishes a local HTTP server with hot module replacement capabilities</li>' +
          '<li>The verification of the successful completion of the aforementioned steps through the examination of the terminal output for the presence of confirmation messages indicating that the server is accepting incoming connections</li>' +
          '</ol>' +
          '<p>Furthermore, it is absolutely essential that developers who are engaged in the process of implementing custom adapter integrations familiarize themselves extensively with the comprehensive documentation that has been prepared regarding the adapter interface specification -- as failure to properly implement the required methods in accordance with the documented contracts will inevitably result in runtime errors that may manifest themselves in unpredictable ways during the editing session... potentially leading to data inconsistencies that could -- under certain circumstances -- prove exceedingly difficult to diagnose and remediate without a thorough understanding of the internal state management mechanisms that govern the synchronization between the editor state and the backend persistence layer.</p>',
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
