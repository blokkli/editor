import { useRouter, useRoute } from '#imports'
import {
  defineBlokkliEditAdapter,
  type BlokkliAdapter,
  type MutationResponseLike,
} from '#blokkli/editor/adapter'
import { defineAnalyzer } from '#blokkli/analyzer'
import accessibilityAnalyzer from '#blokkli/analyzer/axe'
import readabilityAnalyzer from '#blokkli/analyzer/readability'
import { falsy } from '~~/helpers'
import { allTypes } from './mock/allTypes'
import { conversions } from './mock/conversions'
import { entityStorageManager } from './mock/entityStorage'
import { state, editState, mapBlockItem, exportState } from './mock/state'
import { getBlockBundles } from './mock/state/Block'
import type { MutatedState } from './mock/state/EditState'
import { ContentPage, type Content } from './mock/state/Entity/Content'
import { FieldBlocks } from './mock/state/Field/Blocks'
import {
  type MediaIcon,
  MediaImage,
  type MediaVideo,
} from './mock/state/Media/Media'
import { transforms } from './mock/transforms'
import type {
  GetMediaLibraryFunction,
  MediaLibraryItem,
} from '#blokkli/editor/features/media-library/types'
import type { MutationArgsMap } from './mock/plugins/mutations'
import { FieldText } from './mock/state/Field/Text'
import { FieldTextarea } from './mock/state/Field/Textarea'
import type { Block } from './mock/state/Block/Block'
import { FieldReference } from './mock/state/Field/Reference'
import type { MutationAddArgs } from './mock/plugins/mutations/Mutation/Add'
import type {
  DroppableFieldConfig,
  EditableFieldConfig,
} from '#blokkli/editor/features/editable-field/types'
import type { FieldConfig } from '#blokkli/editor/types/definitions'
import type { AssistantResultMarkup } from '#blokkli/editor/features/assistant/types'
import type { LibraryItem } from '#blokkli/editor/features/library/types'
import type { ImportItem } from '#blokkli/editor/features/import-existing/types'
import type { HostTransformPlugin } from '#blokkli/editor/features/transform/types'
import type { CommentItem } from '#blokkli/editor/features/comments/types'
import type { PublishOptions } from '#blokkli/editor/features/publish/types'
import type { TemplateItem } from '#blokkli/editor/features/templates/types'

const ENALBE_EDIT_STATES = false
const ENABLED_ASSISTANT = false

function getPublishOptions(ctx: {
  entityType: string
  entityUuid: string
}): PublishOptions {
  const scheduleKey = `blokkli_schedule_${ctx.entityType}_${ctx.entityUuid}`
  const scheduleData = localStorage.getItem(scheduleKey)

  let publishOn: string | null = null
  let revisionLogMessage: string | null = null

  if (scheduleData) {
    try {
      const parsed = JSON.parse(scheduleData)
      publishOn = parsed.date
      revisionLogMessage = parsed.revisionLogMessage
    } catch {
      // Fallback for old format (plain string)
      publishOn = scheduleData
    }
  }

  return {
    canPublish: true,
    isRevisionable: true,
    hasRevisionLogMessage: true,
    lastChanged: '1725890401',
    canSchedule: true,
    publishOn,
    revisionLogMessage,
  }
}

function getRandomNumberInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
}

const blockAnalyzer = defineAnalyzer(() => {
  return {
    id: 'block-analyzer',
    category: 'content',
    continuous: true,
    run: function (context) {
      const matchingUuids = context.mutatedFields
        .map((mutatedField) => {
          if (mutatedField.entityType !== 'block') {
            return
          }
          const item = context.getFieldListItem(mutatedField.entityUuid)
          if (item?.bundle !== 'grid') {
            return
          }
          const field = context.mutatedFields.find(
            (v) => v.entityUuid === item.uuid && v.name === 'blocks',
          )
          if (field?.list.length) {
            return
          }

          return item.uuid
        })
        .filter(falsy)

      return context.defineResult(
        'no-empty-grid',
        'No empty grid blocks',
        'content',
        'Do not use empty grid blocks.',
        matchingUuids.length ? 'violation' : 'pass',
        matchingUuids.map((uuid) => {
          return {
            targets: [{ uuid }],
          }
        }),
      )
    },
  }
})

const textAnalyzer = defineAnalyzer(() => {
  return {
    id: 'text-analyzer',
    continuous: true,
    run: async function (context) {
      const allTextElements = context.getTextElements()

      // Prepare data for API call
      const texts = allTextElements.map((v, index) => ({
        text: v.text,
        index,
      }))

      // Make API call with abort signal
      const response = await fetch('/api/analyze/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts }),
        signal: context.signal,
      }).catch(() => {
        // Noop.
      })

      if (!response?.ok) {
        return null
      }

      const result: { matches: number[] } = await response.json()

      // Map matching indices back to nodes
      const nodes = result.matches.map((index) => {
        const element = allTextElements[index]!
        return {
          description: element.text,
          targets: [element.element],
        }
      })

      return {
        id: 'blokkli-typo',
        category: 'text',
        title: 'blökkli is not spelled correctly',
        description: 'Please make sure that blökkli is spelled correctly!',
        status: 'violation',
        nodes,
      }
    },
  }
})

export default defineBlokkliEditAdapter((ctx) => {
  // =============================================================================
  // Debugging
  // =============================================================================
  // Set to false to debug the "take ownership" flow.
  let isOwner = true

  const router = useRouter()
  const route = useRoute()
  const mockResponse = (
    mutatedState: MutatedState,
  ): Promise<MutationResponseLike<MutatedState>> => {
    return Promise.resolve({
      success: true,
      state: mutatedState,
    })
  }

  const getEntity = () =>
    entityStorageManager.getContent(ctx.value.entityUuid) as ContentPage

  const addMutation = async <T extends keyof MutationArgsMap>(
    id: T,
    args: MutationArgsMap[T],
  ): Promise<MutationResponseLike<MutatedState>> => {
    editState.addMutation(id, args)
    const entity = getEntity()
    const mutatedState = await editState.getMutatedState(entity)
    return mockResponse(mutatedState)
  }

  const loadComments = (): Promise<CommentItem[]> => {
    const comments: CommentItem[] = entityStorageManager
      .getCommentsForPage(ctx.value.entityUuid)
      .map((item) => {
        return {
          uuid: item.uuid,
          blockUuids: item.getBlockUuids(),
          resolved: item.isResolved(),
          body: item.getBody(),
          created: (item.getCreated() / 1000).toString(),
          user: {
            label: item.getUser().getName(),
          },
        }
      })
    return Promise.resolve(comments)
  }

  function getMediaTargetBundles(bundle: string): string[] {
    if (bundle === 'image') {
      return ['image']
    } else if (bundle === 'video') {
      return ['video']
    } else if (bundle === 'icon') {
      return ['icon', 'card', 'button']
    }

    return []
  }

  const mediaLibraryGetResults: GetMediaLibraryFunction = (e) => {
    const perPage = 16
    const bundle = e.filters.bundle
    const allItems: MediaLibraryItem[] = entityStorageManager
      .getStorage('media')
      .query(bundle && bundle !== 'all' ? { bundle } : {})
      .map((media) => {
        const context =
          media instanceof MediaImage ? media.filename() : media.bundle
        return {
          mediaId: media.uuid,
          label: media.title(),
          context,
          thumbnail: media.thumbnail(),
          targetBundles: getMediaTargetBundles(media.bundle),
          mediaBundle: media.bundle,
        }
      })
      .filter((v) => {
        if (e.filters.text) {
          return v.label.toLowerCase().includes(e.filters.text)
        }

        return true
      })

    const items = allItems.slice(e.page * perPage, e.page * perPage + perPage)
    return Promise.resolve({
      filters: [
        {
          type: 'text',
          name: 'text',
          label: 'Text',
          placeholder: 'Enter a search term',
          required: false,
        },
        {
          type: 'options',
          variant: 'select',
          name: 'bundle',
          label: 'Bundle',
          defaultValue: 'all',
          required: false,
          options: [
            {
              value: 'all',
              label: 'All',
            },
            {
              value: 'image',
              label: 'Image',
            },
            {
              value: 'video',
              label: 'Video',
            },
            {
              value: 'icon',
              label: 'Icon',
            },
          ],
        },
      ],
      items,
      total: allItems.length,
      perPage,
    })
  }

  const adapter: BlokkliAdapter<MutatedState> = {
    mediaLibraryGetResults,
    loadState() {
      // throw new Error('Failed to load state')
      const page = entityStorageManager.getContent(ctx.value.entityUuid)
      if (!page) {
        throw new Error(
          'Failed to load page with UUID: ' + ctx.value.entityUuid,
        )
      }
      const mutatedState = editState.getMutatedState(page)
      return Promise.resolve(mutatedState)
    },
    loadStateAtIndex(index: number) {
      const page = entityStorageManager.getContent(ctx.value.entityUuid)
      if (!page) {
        throw new Error(
          'Failed to load page with UUID: ' + ctx.value.entityUuid,
        )
      }
      return editState.getMutatedState(page, { index })
    },
    getDisabledFeatures() {
      return Promise.resolve([])
    },
    getAllBundles() {
      return Promise.resolve(allTypes)
    },
    getConversions() {
      return Promise.resolve(conversions)
    },
    getTransformPlugins() {
      return Promise.resolve(transforms)
    },
    getHostTransformPlugins() {
      const hostPlugin: HostTransformPlugin = {
        id: 'rewrite_contents',
        label: 'Texte umschreiben',
        preview: true,
        configInputs: [
          {
            type: 'options',
            name: 'type',
            label: 'Schreibstil',
            required: true,
            variant: 'select',
            defaultValue: 'normal',
            description: 'Wählen Sie den gewünschten Schreibstil',
            options: [
              {
                value: 'normal',
                label: 'Normal',
              },
              {
                value: 'simple_german',
                label: 'Einfache Sprache (Deutsch)',
              },
            ],
          },

          {
            type: 'options',
            name: 'type_alt',
            label: 'Schreibstil',
            required: true,
            variant: 'radio',
            defaultValue: 'normal',
            description: 'Wählen Sie den gewünschten Schreibstil',
            options: [
              {
                value: 'normal',
                label: 'Normal',
              },
              {
                value: 'simple_german',
                label: 'Einfache Sprache (Deutsch)',
              },
            ],
          },
          {
            type: 'text',
            name: 'prompt',
            label: 'Anweisungen an KI',
            description:
              'Zusätzliche Anweisungen, z.B. "Verwende keine Fremdwörter".',
            required: true,
            multiline: true,
          },
          {
            type: 'seed',
            name: 'seed',
            label: 'Seed',
            required: true,
          },
        ],
      }
      return Promise.resolve([hostPlugin])
    },
    applyTransformPlugin: (e) => addMutation('transform', e),
    previewTransformPlugin: async (e) => {
      await sleep(2000)
      editState.addMutation('transform', e, true)
      const entity = getEntity()
      const mutatedState = await editState.getMutatedState(entity, {
        save: false,
      })
      editState._tempMutations = null
      editState.currentIndex--
      return mockResponse(mutatedState)
    },
    applyHostTransformPlugin: (e) => addMutation('transform_host', e),
    takeOwnership: async () => {
      isOwner = true
      const entity = getEntity()
      const mutatedState = await editState.getMutatedState(entity)
      return mockResponse(mutatedState)
    },
    mapState(inputState) {
      return {
        currentIndex: editState.currentIndex,
        mutations: editState.getMutationItems(),
        currentUserIsOwner: isOwner,
        ownerName: state.owner.name,
        mutatedEntity: inputState.context.entity.getData(),
        mutatedState: {
          mutatedOptions: inputState.mutatedOptions,
          mutatedHostOptions: inputState.mutatedHostOptions,
          fields: inputState.fields,
          violations: inputState.violations,
        },
        publishOptions: getPublishOptions(ctx.value),
        entity: {
          id: ctx.value.entityUuid,
          label: 'Demo Page',
          status: false,
          bundleLabel: 'Page',
        },
        translationState: {
          isTranslatable: true,
          sourceLanguage: 'en',
          availableLanguages: [
            {
              id: 'en',
              name: 'English',
            },
            // {
            //   id: 'en-US',
            //   name: 'English (United States)',
            // },
            {
              id: 'de',
              name: 'German',
            },
            // {
            //   id: 'de-CH',
            //   name: 'German (Switzerland)',
            // },
            {
              id: 'fr',
              name: 'French',
            },
            {
              id: 'it',
              name: 'Italian',
            },
          ],
          translations: [
            {
              id: 'en',
              url: '/en',
              status: true,
              exists: true,
            },
            {
              id: 'de',
              url: '/de',
              status: true,
              exists: true,
            },
          ],
        },
      }
    },
    changeLanguage(e) {
      return router.push({
        path: e.url,
        query: route.query,
      })
    },
    async revertAllChanges() {
      editState.revert()
      return mockResponse(await editState.getMutatedState(getEntity()))
    },
    loadComments() {
      return loadComments()
    },
    resolveComment(uuid) {
      entityStorageManager.resolveComment(uuid)
      return loadComments()
    },
    addComment(blockUuids, body) {
      entityStorageManager.addComment({
        body,
        created: Date.now(),
        isResolved: false,
        parentEntityType: ctx.value.entityType,
        parentEntityUuid: ctx.value.entityUuid,
        referencedBlocks: blockUuids,
        user: '1',
      })
      return loadComments()
    },
    addNewBlock: (e) =>
      addMutation('add', {
        bundle: e.bundle,
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),

    moveBlock: (e) =>
      addMutation('move', {
        uuids: [e.item.block.uuid],
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),

    moveMultipleBlocks: (e) =>
      addMutation('move', {
        uuids: e.uuids,
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),

    deleteBlocks: (uuids) =>
      addMutation('delete', {
        uuids,
      }),

    duplicateBlocks: (uuids) =>
      addMutation('duplicate', {
        uuids,
      }),

    pasteExistingBlocks: (e) =>
      addMutation('duplicate', {
        uuids: e.uuids,
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.preceedingUuid,
      }),

    updateFieldValue: (e) =>
      addMutation('update_field_value', {
        uuid: e.uuid,
        fieldName: e.fieldName,
        fieldValue: e.fieldValue,
      }),

    updateEntityFieldValue: (e) =>
      addMutation('update_entity_field_value', {
        fieldName: e.fieldName,
        fieldValue: e.fieldValue,
      }),

    getImportItems(args) {
      const items: ImportItem[] = [
        {
          uuid: '1',
          label: 'Homepage',
          description:
            'Main landing page with hero section and featured content',
        },
        {
          uuid: '2',
          label: 'Contact Page',
          description: 'Contact form and company address information',
        },
        {
          uuid: '3',
          label: 'Service Page',
          description: 'Overview of all services offered',
        },
        {
          uuid: '4',
          label: 'Features',
          description: 'Detailed feature descriptions and benefits',
        },
        {
          uuid: '5',
          label: 'About Us',
          description: 'Company history and mission statement',
        },
        {
          uuid: '6',
          label: 'Blog Overview',
          description: 'Latest articles and news posts',
        },
        {
          uuid: '7',
          label: 'Product Catalog',
          description: 'Complete list of available products',
        },
        {
          uuid: '8',
          label: 'Pricing Plans',
          description: 'Subscription tiers and pricing options',
        },
        {
          uuid: '9',
          label: 'FAQ',
          description: 'Frequently asked questions and answers',
        },
        {
          uuid: '10',
          label: 'Team Members',
          description: 'Staff profiles and contact details',
        },
        {
          uuid: '11',
          label: 'Testimonials',
          description: 'Customer reviews and success stories',
        },
        {
          uuid: '12',
          label: 'Case Studies',
          description: 'In-depth project analyses and results',
        },
        {
          uuid: '13',
          label: 'Portfolio',
          description: 'Showcase of completed work and projects',
        },
        {
          uuid: '14',
          label: 'News & Updates',
          description: 'Company announcements and press releases',
        },
        {
          uuid: '15',
          label: 'Career Opportunities',
          description: 'Open positions and job applications',
        },
        {
          uuid: '16',
          label: 'Privacy Policy',
          description: 'Data protection and privacy guidelines',
        },
        {
          uuid: '17',
          label: 'Terms of Service',
          description: 'Legal terms and conditions of use',
        },
        {
          uuid: '18',
          label: 'Support Center',
          description: 'Help resources and ticket submission',
        },
        {
          uuid: '19',
          label: 'Documentation',
          description: 'Technical guides and API reference',
        },
        {
          uuid: '20',
          label: 'Partner Program',
          description: 'Partnership opportunities and benefits',
        },
      ]
      const text = (args.filters.text ?? '').toLocaleLowerCase()
      const itemsFiltered = items.filter((item) => {
        if (text && !item.label.toLocaleLowerCase().includes(text)) {
          return false
        }

        if (args.filters.from_user) {
          // Return items with even UUIDs as "created by current user"
          return Number.parseInt(item.uuid) % 2 === 0
        }

        return true
      })
      const perPage = 16
      const offset = args.page * perPage
      const paginatedItems = itemsFiltered.slice(offset, offset + perPage)
      return Promise.resolve({
        items: paginatedItems,
        total: itemsFiltered.length,
        filters: [
          {
            type: 'text',
            name: 'text',
            label: 'Text',
            placeholder: 'Enter a search term',
            required: false,
          },
          {
            type: 'checkbox',
            name: 'from_user',
            label: 'Pages created by me',
            required: false,
            defaultValue: false,
          },
        ],
        perPage,
      })
    },

    importFromExisting() {
      return Promise.resolve() as any
    },

    getLibraryItems(data) {
      const libraryItems = entityStorageManager.storages.library_item.loadAll()

      const perPage = 2
      const offset = data.page * perPage
      const text = (data.filters.text ?? '').toLocaleLowerCase()

      const items: LibraryItem[] = libraryItems
        .map((item) => {
          const block = item.getBlocks().getBlocks()[0]
          if (!block) {
            return
          }
          if (!data.bundles.includes(block.bundle)) {
            return
          }
          const label = item.title()
          if (text && !label.toLocaleLowerCase().includes(text)) {
            return
          }
          return {
            uuid: item.uuid,
            label,
            bundle: block.bundle,
            item: mapBlockItem(block),
          }
        })
        .filter(falsy)

      return Promise.resolve({
        items: items.slice(offset, offset + perPage),
        total: items.length,
        perPage,
        filters: [
          {
            type: 'text',
            name: 'text',
            label: 'Text',
            placeholder: 'Enter a search term',
            required: false,
          },
        ],
      })
    },

    addLibraryItem: (e) =>
      addMutation('add_reusable_item', {
        libraryItemUuid: e.libraryItemUuid,
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),
    detachReusableBlock: (e) => addMutation('detach_reusable', e),

    async setHistoryIndex(index: number) {
      editState.currentIndex = Math.min(
        Math.max(index, -1),
        editState.getMutations().length,
      )
      return mockResponse(await editState.getMutatedState(getEntity()))
    },

    formFrameBuilder(e) {
      const prefix = `/blokkli-form/${ctx.value.entityType}/${ctx.value.entityUuid}`
      let url = ''
      const params = new URLSearchParams()
      if (e.id === 'block:add') {
        url = '/addBlock'
        params.set('bundle', e.data.bundle)
        params.set('hostEntityType', e.data.host.type)
        params.set('hostEntityUuid', e.data.host.uuid)
        params.set('hostField', e.data.host.fieldName)
        if (e.data.afterUuid) {
          params.set('preceedingUuid', e.data.afterUuid)
        }
      } else if (e.id === 'block:edit') {
        url = '/editBlock'
        params.set('uuid', e.data.uuid)
      } else if (e.id === 'block:translate') {
        url = '/translateBlock'
        params.set('uuid', e.data.uuid)
        params.set('langcode', e.langcode)
      } else if (e.id === 'entity:edit') {
        url = '/editEntity'
      }

      if (url) {
        return { url: `${prefix}${url}?${params.toString()}` }
      }
    },

    updateOptions: (options) =>
      addMutation('update_options', {
        options,
      }),

    makeBlockReusable: (e) => addMutation('make_reusable', e),

    getContentSearchTabs() {
      return {
        images: 'Images',
        videos: 'Videos',
        icons: 'Icons',
      }
    },

    clipboardMapBundle(e) {
      if (
        e.type === 'video' &&
        (e.videoService === 'youtube' || e.videoService === 'vimeo')
      ) {
        return 'video'
      } else if (e.type === 'plaintext') {
        return 'text'
      }
    },

    getContentSearchResults(tab, text) {
      if (tab === 'images') {
        return Promise.resolve(
          entityStorageManager.storages.media
            .query<MediaImage>({ bundle: 'image' })
            .map((image) => {
              return {
                id: image.uuid,
                title: image.alt(),
                text: image.alt(),
                targetBundles: ['image'],
                imageUrl: image.url(),
                entityType: image.entityType,
                entityBundle: image.bundle,
              }
            })
            .filter((v) => v.title.toLowerCase().includes(text.toLowerCase())),
        )
      } else if (tab === 'videos') {
        return Promise.resolve(
          entityStorageManager.storages.media
            .query<MediaVideo>({ bundle: 'video' })
            .map((image) => {
              return {
                id: image.uuid,
                title: image.title(),
                text: image.title(),
                targetBundles: ['video'],
                imageUrl: image.thumbnail(),
                entityType: image.entityType,
                entityBundle: image.bundle,
              }
            })
            .filter((v) => v.title.toLowerCase().includes(text.toLowerCase())),
        )
      } else if (tab === 'icons') {
        return Promise.resolve(
          entityStorageManager.storages.media
            .query<MediaIcon>({ bundle: 'icon' })
            .map((icon) => {
              return {
                id: icon.uuid,
                title: icon.name(),
                text: icon.name(),
                targetBundles: ['icon', 'card', 'button'],
                entityType: icon.entityType,
                imageUrl: icon.getSrcUrl(),
                entityBundle: icon.bundle,
              }
            })
            .filter((v) => v.title.toLowerCase().includes(text.toLowerCase())),
        )
      }
      return Promise.resolve([])
    },

    addContentSearchItem(e) {
      if (e.bundle === 'image') {
        return addMutation('add', {
          bundle: 'image',
          values: {
            imageReference: [e.item.id],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      } else if (e.bundle === 'video') {
        return addMutation('add', {
          bundle: 'video',
          values: {
            video: [e.item.id],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      } else if (e.bundle === 'icon') {
        return addMutation('add', {
          bundle: 'icon',
          values: {
            icon: [e.item.id],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      } else if (e.bundle === 'button') {
        return addMutation('add', {
          bundle: 'button',
          values: {
            icon: [e.item.id],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      } else if (e.bundle === 'card') {
        return addMutation('add', {
          bundle: 'card',
          values: {
            icon: [e.item.id],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      }
    },

    addBlockFromClipboardItem(e) {
      if (e.item.itemBundle === 'text') {
        return addMutation('add', {
          bundle: 'text',
          values: {
            text: e.item.data,
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      } else if (e.item.type === 'video') {
        return addMutation('add_video_from_url', {
          url: 'https://www.youtube.com/watch?v=' + e.item.videoId,
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.afterUuid,
        })
      }
    },

    buildEditableFrameUrl(e) {
      const prefix = `/blokkli-form/${ctx.value.entityType}/${ctx.value.entityUuid}/fieldValueEditor`
      const params = new URLSearchParams()
      params.set('fieldName', e.fieldName)
      if (e.uuid) {
        params.set('uuid', e.uuid)
      }
      return `${prefix}?${params.toString()}`
    },

    getFieldConfig() {
      const entity = getEntity()
      const fields: FieldConfig[] = []

      entity.getBlockFields().forEach((field) => {
        fields.push({
          name: field.id,
          label: field.label,
          cardinality: field.cardinality,
          entityType: entity.entityType,
          entityBundle: entity.bundle,
          canEdit: true,
          allowedBundles: field.allowedBundles,
        })
      })

      getBlockBundles().forEach((blockBundle) => {
        blockBundle.getFieldDefintions().forEach((field) => {
          if (field instanceof FieldBlocks) {
            fields.push({
              name: field.id,
              label: field.label,
              cardinality: field.cardinality,
              entityType: 'block',
              entityBundle: blockBundle.bundle,
              canEdit: true,
              allowedBundles: field.allowedBundles,
            })
          }
        })
      })

      return Promise.resolve(fields)
    },

    getGridMarkup() {
      return `<div class="container">${Array(12)
        .fill('<div></div>')
        .join('')}</div>`
    },

    getPreviewGrantUrl() {
      console.log('Get preview grant URL')
      return route.fullPath
    },

    mediaLibraryAddBlock(e) {
      if (e.item.mediaBundle === 'image') {
        return addMutation('add', {
          bundle: 'image',
          values: {
            imageReference: [e.item.mediaId],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.preceedingUuid,
        })
      } else if (e.item.mediaBundle === 'video') {
        return addMutation('add', {
          bundle: 'video',
          values: {
            video: [e.item.mediaId],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.preceedingUuid,
        })
      } else if (e.item.mediaBundle === 'icon') {
        return addMutation('add', {
          bundle: e.targetBundle,
          values: {
            icon: [e.item.mediaId],
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.preceedingUuid,
        })
      }
    },

    mediaLibraryAddBlocks(e) {
      const args: MutationAddArgs[] = e.items
        .map((item) => {
          if (item.mediaBundle === 'image') {
            return {
              bundle: e.targetBundle,
              values: {
                imageReference: [item.mediaId],
              },
              hostEntityType: e.host.type,
              hostEntityUuid: e.host.uuid,
              hostField: e.host.fieldName,
              preceedingUuid: e.preceedingUuid,
            }
          } else if (item.mediaBundle === 'video') {
            return {
              bundle: e.targetBundle,
              values: {
                video: [item.mediaId],
              },
              hostEntityType: e.host.type,
              hostEntityUuid: e.host.uuid,
              hostField: e.host.fieldName,
              preceedingUuid: e.preceedingUuid,
            }
          } else if (item.mediaBundle === 'icon') {
            return {
              bundle: e.targetBundle,
              values: {
                icon: [item.mediaId],
              },
              hostEntityType: e.host.type,
              hostEntityUuid: e.host.uuid,
              hostField: e.host.fieldName,
              preceedingUuid: e.preceedingUuid,
            }
          }
        })
        .filter(falsy)

      return addMutation('add', args)
    },

    mediaLibraryReplaceMedia(e) {
      return addMutation('replace_media', {
        blockUuid: e.host.uuid,
        fieldName: e.host.fieldName,
        mediaUuid: e.mediaId,
      })
    },

    mediaLibraryReplaceEntityMedia(e) {
      return addMutation('replace_entity_media', {
        fieldName: e.host.fieldName,
        mediaUuid: e.mediaId,
      })
    },

    fragmentsAddBlock(e) {
      return addMutation('add', {
        bundle: 'blokkli_fragment',
        values: {
          name: [e.name],
        },
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.preceedingUuid ?? null,
      })
    },

    getEditableFieldConfig() {
      const mapEntityFields = (
        entity: typeof Content | typeof Block,
      ): EditableFieldConfig[] => {
        return entity
          .getFieldDefintions()
          .map<EditableFieldConfig | undefined>((field) => {
            if (field instanceof FieldText || field instanceof FieldTextarea) {
              return {
                name: field.id,
                entityType: entity.entityType,
                entityBundle: entity.bundle,
                label: field.label,
                type: field instanceof FieldText ? 'plain' : 'frame',
                required: field.required,
                maxLength: field.maxLength,
              }
            }
          })
          .filter(falsy)
      }

      const blockFields: EditableFieldConfig[] = getBlockBundles().flatMap(
        (v) => mapEntityFields(v),
      )

      const contentFields: EditableFieldConfig[] = mapEntityFields(ContentPage)

      return Promise.resolve([...contentFields, ...blockFields])
    },

    getDroppableFieldConfig() {
      const mapEntityFields = (
        entity: typeof Content | typeof Block,
      ): DroppableFieldConfig[] => {
        return entity
          .getFieldDefintions()
          .map<DroppableFieldConfig | undefined>((field) => {
            if (field instanceof FieldReference) {
              return {
                name: field.id,
                label: field.label,
                entityType: entity.entityType,
                entityBundle: entity.bundle,
                allowedEntityType: field.targetEntityType,
                allowedBundles: field.allowedBundles,
                cardinality: field.cardinality,
                required: field.required,
              }
            }
          })
          .filter(falsy)
      }
      return Promise.resolve([
        ...getBlockBundles().flatMap((v) => mapEntityFields(v)),
        ...mapEntityFields(ContentPage),
      ])
    },

    async publish(options) {
      const delay = getRandomNumberInRange(400, 1600)
      await sleep(delay)

      if (options.hostEntityUuid === 'error') {
        return {
          success: false,
          state: null,
          errors: [
            'There was an internal server error, please try again later.',
          ],
        }
      }

      // Only persist in dev mode
      if (import.meta.dev) {
        try {
          const data = await exportState()

          await $fetch('/api/snapshots', {
            method: 'POST',
            body: data,
          })

          // Clear mutations from localStorage after successful save
          editState.revert()
        } catch (e) {
          console.error('Failed to persist snapshots:', e)
          // Don't fail publish if snapshot save fails
        }
      }

      return {
        success: true,
        state: null,
        errors: [],
      }
    },

    getPublishOptions() {
      return Promise.resolve(getPublishOptions(ctx.value))
    },

    async scheduleEditState(options) {
      const scheduleKey = `blokkli_schedule_${options.hostEntityType}_${options.hostEntityUuid}`
      const scheduleData = {
        date: options.date,
        revisionLogMessage: options.revisionLogMessage,
      }
      localStorage.setItem(scheduleKey, JSON.stringify(scheduleData))
      return mockResponse(await editState.getMutatedState(getEntity()))
    },

    async unscheduleEditState(options) {
      const scheduleKey = `blokkli_schedule_${options.hostEntityType}_${options.hostEntityUuid}`
      localStorage.removeItem(scheduleKey)
      return mockResponse(await editState.getMutatedState(getEntity()))
    },

    async setBlockScheduleDate(blocks) {
      return addMutation('set_block_schedule', { blocks })
    },

    getEditStates() {
      if (!ENALBE_EDIT_STATES) {
        return Promise.resolve({
          items: [],
          total: 0,
          perPage: 16,
          filters: [],
        })
      }

      return Promise.resolve({
        items: [
          {
            hostEntityType: 'page',
            hostEntityUuid: '123456',
            currentUserIsOwner: true,
            entity: {
              bundleLabel: 'Page',
              status: true,
              label: 'Homepage',
            },
          },
          {
            hostEntityType: 'page',
            hostEntityUuid: '123459',
            currentUserIsOwner: true,
            entity: {
              bundleLabel: 'Page',
              status: true,
              label: 'Contact',
            },
          },
          {
            hostEntityType: 'page',
            hostEntityUuid: '123460',
            currentUserIsOwner: false,
            entity: {
              bundleLabel: 'Page',
              status: false,
              label: 'Services and Products',
            },
          },
          {
            hostEntityType: 'page',
            hostEntityUuid: '123465',
            currentUserIsOwner: false,
            entity: {
              bundleLabel: 'Page',
              status: true,
              label:
                'A page with a very long title to see what happens when the text breaks on a new line',
            },
          },
          {
            hostEntityType: 'page',
            hostEntityUuid: 'error',
            currentUserIsOwner: true,
            entity: {
              bundleLabel: 'Page',
              status: true,
              label: 'A page that will return a publish error',
            },
          },
        ],
        total: 3,
        perPage: 16,
        filters: [],
      })
    },

    updateHostOptions: (options) =>
      addMutation('update_host_options', {
        options,
      }),

    getAnalyzers: () => {
      return [
        blockAnalyzer(),
        textAnalyzer(),
        readabilityAnalyzer(),
        accessibilityAnalyzer({
          runOptions: {
            rules: {
              region: {
                enabled: false,
              },
              'frame-tested': {
                enabled: false,
              },
            },
          },
        }),
      ]
    },
  }

  // Only available in dev mode.
  if (import.meta.dev) {
    adapter.getLibraryItemEditUrl = function () {
      return 'http://localhost:3000/de?blokkliEditing=1'
    }

    adapter.userSettings = {
      load() {
        return $fetch<string>('/api/user-settings')
      },
      async persist(data) {
        await $fetch<string>('/api/user-settings', {
          method: 'post',
          body: {
            data,
          },
        })
      },
    }
  }

  adapter.templatesSearch = function (e) {
    const templateItems = entityStorageManager.storages.template_item.loadAll()
    const perPage = 10
    const offset = e.page * perPage

    // Get allowed bundles for the target field
    let allowedBundles: string[] = []
    if (e.host) {
      const entity = entityStorageManager.load(e.host.type as any, e.host.uuid)
      if (entity) {
        const field = entity.get<FieldBlocks>(e.host.fieldName)
        if (field && field.allowedBundles) {
          allowedBundles = field.allowedBundles
        }
      }
    }

    // Collect all unique bundles from templates for the filter options
    const allBundles = new Set<string>()
    templateItems.forEach((template) => {
      template
        .getBlocks()
        .getBlocks()
        .forEach((b) => allBundles.add(b.bundle))
    })

    // Filter: ALL bundles in template must be allowed
    let filtered = templateItems.filter((template) => {
      const templateBundles = template
        .getBlocks()
        .getBlocks()
        .map((b) => b.bundle)
      return (
        allowedBundles.length === 0 ||
        templateBundles.every((b) => allowedBundles.includes(b))
      )
    })

    // Apply text filter
    const textFilter = e.filters?.text as string | undefined
    if (textFilter) {
      const searchText = textFilter.toLowerCase()
      filtered = filtered.filter((template) => {
        const label = template.title().toLowerCase()
        const description = template.description()?.toLowerCase() || ''
        return label.includes(searchText) || description.includes(searchText)
      })
    }

    // Apply bundle filter
    const bundleFilter = e.filters?.bundle as string | undefined
    if (bundleFilter && bundleFilter !== 'all') {
      filtered = filtered.filter((template) => {
        const templateBundles = template
          .getBlocks()
          .getBlocks()
          .map((b) => b.bundle)
        return templateBundles.includes(bundleFilter)
      })
    }

    const items: TemplateItem[] = filtered
      .slice(offset, offset + perPage)
      .map((template) => ({
        uuid: template.uuid,
        label: template.title(),
        description: template.description(),
        items: template
          .getBlocks()
          .getBlocks()
          .map((block) => mapBlockItem(block)),
        isDefault: template.isDefault(),
      }))

    // Build bundle options from allowed bundles that exist in templates
    const blockClasses = getBlockBundles()
    const bundleOptions = Array.from(allBundles)
      .filter((bundle) => allowedBundles.length === 0 || allowedBundles.includes(bundle))
      .map((bundle) => {
        const BlockClass = blockClasses.find((c) => c.bundle === bundle)
        return {
          value: bundle,
          label: BlockClass?.label || bundle,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))

    return Promise.resolve({
      items,
      total: filtered.length,
      perPage,
      filters: [
        {
          type: 'text',
          name: 'text',
          label: 'Search',
          placeholder: 'Search templates...',
          required: false,
        },
        {
          type: 'options',
          variant: 'select',
          name: 'bundle',
          label: 'Bundle',
          defaultValue: 'all',
          required: false,
          options: [
            {
              value: 'all',
              label: 'All',
            },
            ...bundleOptions,
          ],
        },
      ],
    })
  }

  adapter.templatesAdd = function (e) {
    return addMutation('add_template', {
      templateUuid: e.templateUuid,
      hostEntityType: e.host.type,
      hostEntityUuid: e.host.uuid,
      hostField: e.host.fieldName,
      preceedingUuid: e.afterUuid,
    })
  }

  adapter.templatesCreate = function (e) {
    return addMutation('create_template', {
      label: e.label,
      description: e.description,
      uuids: e.uuids,
      isDefault: e.isDefault,
    })
  }

  if (import.meta.dev && ENABLED_ASSISTANT) {
    adapter.assistantGetResults = (e) => {
      return $fetch<AssistantResultMarkup | undefined>('/api/gpt', {
        method: 'post',
        body: {
          prompt: e.prompt,
        },
      })
    }

    adapter.assistantAddBlockFromResult = (e) => {
      if (e.result.type === 'markup') {
        return addMutation('add', {
          bundle: 'text',
          values: {
            text: e.result.content,
          },
          hostEntityType: e.host.type,
          hostEntityUuid: e.host.uuid,
          hostField: e.host.fieldName,
          preceedingUuid: e.preceedingUuid,
        })
      }
    }
  }

  return adapter
})
