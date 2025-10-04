import { useRouter, useRoute } from '#imports'
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import { defineAnalyzer } from '#blokkli/analyzer'
import accessibilityAnalyzer from '#blokkli/analyzer/axe'
import readabilityAnalyzer from '#blokkli/analyzer/readability'
import type {
  BlokkliAdapter,
  GetMediaLibraryFunction,
  MutationResponseLike,
} from '#blokkli/adapter'
import { falsy } from '~~/helpers'
import type {
  AssistantResultMarkup,
  CommentItem,
  DroppableFieldConfig,
  EditableFieldConfig,
  FieldConfig,
  HostTransformPlugin,
  LibraryItem,
} from '#blokkli/types'
import { allTypes } from './mock/allTypes'
import { conversions } from './mock/conversions'
import { entityStorageManager } from './mock/entityStorage'
import { state, editState, mapBlockItem } from './mock/state'
import { getBlockBundles } from './mock/state/Block'
import type { MutatedState } from './mock/state/EditState'
import { ContentPage, type Content } from './mock/state/Entity/Content'
import { FieldBlocks } from './mock/state/Field/Blocks'
import { MediaImage, type MediaVideo } from './mock/state/Media/Media'
import { transforms } from './mock/transforms'
import type { MediaLibraryItem } from '#blokkli/components/Features/MediaLibrary/types'
import type { MutationArgsMap } from './mock/plugins/mutations'
import { FieldText } from './mock/state/Field/Text'
import { FieldTextarea } from './mock/state/Field/Textarea'
import type { Block } from './mock/state/Block/Block'
import { FieldReference } from './mock/state/Field/Reference'
import type { MutationAddArgs } from './mock/plugins/mutations/Mutation/Add'

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
    run: function (context) {
      const nodes = context
        .getTextElements()
        .filter(
          (v) =>
            v.text.includes('blokkli') &&
            !v.text.includes('paragraphs_blokkli'),
        )
        .map((v) => {
          return {
            description: v.text,
            targets: [v.element],
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

  const mediaLibraryGetResults: GetMediaLibraryFunction<{
    bundle: 'select'
    text: 'text'
  }> = (e) => {
    const perPage = 4
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
          targetBundles: [media.bundle === 'image' ? 'image' : 'video'],
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
      filters: {
        text: {
          type: 'text',
          label: 'Text',
          placeholder: 'Enter a search term',
        },
        bundle: {
          type: 'select',
          label: 'Bundle',
          default: 'image',
          options: {
            all: 'All',
            image: 'Image',
            video: 'Video',
          },
        },
      },
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
    resolveComment() {
      console.log('Resolve comment')
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

    updateEntityFieldValue: (e) =>
      addMutation('update_entity_field_value', {
        fieldName: e.fieldName,
        fieldValue: e.fieldValue,
      }),

    getImportItems() {
      return Promise.resolve({ items: [], total: 0 })
    },

    importFromExisting() {
      return Promise.resolve() as any
    },

    getLibraryItems(data) {
      const libraryItems = entityStorageManager.storages.library_item.loadAll()

      const perPage = 2
      const offset = data.page * perPage

      const items: LibraryItem[] = libraryItems
        .map((item) => {
          const block = item.getBlocks().getBlocks()[0]
          if (!block) {
            return
          }
          if (!data.bundles.includes(block.bundle)) {
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

      return Promise.resolve({
        items: items.slice(offset, offset + perPage),
        total: items.length,
        perPage,
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

    mediaLibraryAddBlocks(e) {
      const args: MutationAddArgs[] = e.items
        .map((item) => {
          if (item.itemBundle === 'image') {
            return {
              bundle: 'image',
              values: {
                imageReference: [item.mediaId],
              },
              hostEntityType: e.host.type,
              hostEntityUuid: e.host.uuid,
              hostField: e.host.fieldName,
              preceedingUuid: e.preceedingUuid,
            }
          } else if (item.itemBundle === 'video') {
            return {
              bundle: 'video',
              values: {
                video: [item.mediaId],
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
        preceedingUuid: e.preceedingUuid,
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

    publish(options) {
      const delay = getRandomNumberInRange(400, 1600)
      return new Promise((resolve) => {
        setTimeout(() => {
          if (options.hostEntityUuid === 'error') {
            return resolve({
              success: false,
              state: null,
              errors: [
                'There was an internal server error, please try again later.',
              ],
            })
          }
          return resolve({
            success: true,
            state: null,
            errors: [],
          })
        }, delay)
      })
    },

    getPublishOptions() {
      return Promise.resolve({
        canPublish: true,
        isRevisionable: true,
        hasRevisionLogMessage: true,
        lastChanged: '1725890401',
      })
    },

    getEditStates() {
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
    adapter.getLibraryItemEditUrl = function() {
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

  return adapter
})
