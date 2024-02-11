import { useRouter, useRoute } from '#imports'
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type {
  BlokkliAdapter,
  GetMediaLibraryFunction,
  MutationResponseLike,
} from '#blokkli/adapter'
import { falsy } from '#blokkli/helpers'
import type {
  AssistantResultMarkup,
  CommentItem,
  FieldConfig,
  LibraryItem,
} from '#blokkli/types'
import { allTypes } from './mock/allTypes'
import { conversions } from './mock/conversions'
import { entityStorageManager } from './mock/entityStorage'
import { state, editState, mapBlockItem } from './mock/state'
import { getBlockBundles } from './mock/state/Block'
import type { MutatedState } from './mock/state/EditState'
import type { ContentPage } from './mock/state/Entity/Content'
import { FieldBlocks } from './mock/state/Field/Blocks'
import type { MediaImage, MediaVideo } from './mock/state/Media/Media'
import { transforms } from './mock/transforms'
import type { MediaLibraryItem } from '#blokkli/components/Features/MediaLibrary/types'

export default defineBlokkliEditAdapter((ctx) => {
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

  const addMutation = (
    id: any,
    args: any,
  ): Promise<MutationResponseLike<MutatedState>> => {
    editState.addMutation(id, args)
    const entity = getEntity()
    const mutatedState = editState.getMutatedState(entity)
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

  const mediaLibraryGetResults: GetMediaLibraryFunction<{
    bundle: 'select'
    foobar: 'checkbox'
    text: 'text'
  }> = (e) => {
    const bundle = e.filters.bundle || 'image'
    const items: MediaLibraryItem[] = entityStorageManager
      .getStorage('media')
      .query({ bundle })
      .map((media) => {
        return {
          mediaId: media.uuid,
          label: media.title(),
          context: media.bundle,
          thumbnail: media.thumbnail(),
          blockBundle: bundle,
        }
      })
      .filter((v) => {
        if (e.filters.text) {
          return v.label.toLowerCase().includes(e.filters.text)
        }

        return true
      })
    return Promise.resolve({
      filters: {
        bundle: {
          type: 'select',
          label: 'Bundle',
          options: {
            image: 'Image',
            video: 'Video',
          },
        },
        foobar: {
          type: 'checkbox',
          label: 'Do you want to do that',
        },
        text: {
          type: 'text',
          label: 'Text',
          placeholder: 'Enter a search term',
        },
      },
      items,
      total: 253,
      perPage: 16,
    })
  }

  const adapter: BlokkliAdapter<MutatedState> = {
    mediaLibraryGetResults,
    loadState() {
      const page = entityStorageManager.getContent(ctx.value.entityUuid)
      if (!page) {
        throw new Error(
          'Failed to load page with UUID: ' + ctx.value.entityUuid,
        )
      }
      const mutatedState = editState.getMutatedState(page)
      return Promise.resolve(mutatedState)
    },
    getDisabledFeatures() {
      return Promise.resolve([])
    },
    getAllBundles() {
      return Promise.resolve(allTypes)
    },
    getConversions() {
      console.log('Get conversion plugins')
      return Promise.resolve(conversions)
    },
    getTransformPlugins() {
      console.log('Get transform plugins')
      return Promise.resolve(transforms)
    },
    applyTransformPlugin: (e) => addMutation('transform', e),
    mapState(inputState) {
      return {
        currentIndex: editState.currentIndex,
        mutations: editState.getMutationItems(),
        currentUserIsOwner: true,
        ownerName: state.owner.name,
        mutatedState: {
          mutatedOptions: inputState.mutatedOptions,
          fields: inputState.fields,
          violations: [],
        },
        entity: {
          id: ctx.value.entityUuid,
          label: 'Demo Page',
          status: true,
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
            {
              id: 'de',
              name: 'German',
            },
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
            },
            {
              id: 'de',
              url: '/de',
              status: true,
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
    revertAllChanges() {
      editState.revert()
      return mockResponse(editState.getMutatedState(getEntity()))
    },
    loadComments() {
      console.log('Load comments')
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
        uuids: [e.item.uuid],
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

    getImportItems(text) {
      return Promise.resolve({ items: [], total: 0 })
    },

    importFromExisting() {
      return Promise.resolve() as any
    },

    getLibraryItems(bundles: string[]) {
      console.log('Get library items')
      const libraryItems = entityStorageManager.storages.library_item.loadAll()

      const items: LibraryItem[] = libraryItems
        .map((item) => {
          const block = item.getBlocks().getBlocks()[0]
          if (!block) {
            return
          }
          if (!bundles.includes(block.bundle)) {
            return
          }
          return {
            uuid: item.uuid,
            label: item.title(),
            bundle: block.bundle,
            item: mapBlockItem(block),
          }
        })
        .filter(falsy)

      return Promise.resolve(items)
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

    setHistoryIndex(index: number) {
      editState.currentIndex = Math.min(
        Math.max(index, -1),
        editState.getMutations().length,
      )
      return mockResponse(editState.getMutatedState(getEntity()))
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
      return
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
      }
    },

    addBlockFromClipboardItem(e) {
      if (e.item.itemBundle === 'text') {
        return addMutation('add', {
          bundle: 'text',
          values: {
            text: e.item.clipboardData,
          },
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

    assistantGetResults(e) {
      return $fetch<AssistantResultMarkup | undefined>('/api/gpt', {
        method: 'post',
        body: {
          prompt: e.prompt,
        },
      })
    },

    assistantAddBlockFromResult(e) {
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
      if (e.item.itemBundle === 'image') {
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
      } else if (e.item.itemBundle === 'video') {
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
      }
    },

    fragmentsAddBlock(e) {
      return addMutation('add', {
        bundle: 'fragment',
        values: {
          name: [e.name],
        },
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.preceedingUuid,
      })
    },
  }

  return adapter
})
