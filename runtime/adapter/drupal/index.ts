import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'
import { falsy } from '../../components/Edit/helpers'
import { PbType } from '../../types'
import { PbAdapter } from '../../types/adapter'

type PbAdapterContext = {
  entityType: any
  entityUuid: string
  langcode: string
}

type PbAdapterFactory<T> = (ctx: PbAdapterContext) => PbAdapter<T>

const getDrupalAdapter: PbAdapterFactory<ParagraphsBuilderEditStateFragment> = (
  ctx,
) => {
  return {
    getConversions() {
      return useGraphqlQuery('pbConversions').then(
        (v) => v.data.paragraphsBuilderConversions || [],
      )
    },
    getAvailableParagraphTypes() {
      return useGraphqlQuery('pbAllowedTypes').then(
        (v) => v.data.paragraphsBuilderAllowedTypes || [],
      )
    },
    getAllParagraphTypes() {
      return useGraphqlQuery('pbAllTypes').then((v) => {
        const allTypes = v.data.entityQuery.items?.filter(
          (v) => v && 'icon' in v,
        ) as PbType[]
        return allTypes
      })
    },
    loadState(langcode) {
      return useGraphqlQuery('paragraphsEditState', {
        ...ctx,
        langcode: langcode || undefined,
      }).then((v) => v.data.state)
    },
    async getAvailableFeatures() {
      const data = await useGraphqlQuery(
        'paragraphsBuilderAvailableFeatures',
      ).then((v) => v.data.features)
      const mutations = data?.mutations || []
      return {
        comment: !!data?.comment,
        conversion: !!data?.conversion,
        duplicate: mutations.includes('duplicate'),
        library: !!data?.library,
      }
    },
    takeOwnership() {
      return useGraphqlMutation('paragraphsBuilderTakeOwnership', ctx)
    },
    setHistoryIndex(index) {
      return useGraphqlMutation('paragraphsBuilderSetHistoryIndex', {
        ...ctx,
        index,
      })
    },
    redo() {
      return useGraphqlMutation('paragraphsBuilderRedo', ctx)
    },
    undo() {
      return useGraphqlMutation('paragraphsBuilderUndo', ctx)
    },
    publish() {
      return useGraphqlMutation('paragraphsBuilderPublish', ctx)
    },
    importFromExisting(e) {
      return useGraphqlMutation('paragraphsBuilderCopyFromExisting', {
        ...ctx,
        sourceUuid: e.sourceUuid,
        fields: e.sourceFields,
      })
    },
    revertAllChanges() {
      return useGraphqlMutation('revertAllChanges', ctx)
    },
    makeParagraphReusable(e) {
      return useGraphqlMutation('makeParagraphReusable', {
        ...ctx,
        ...e,
      })
    },
    duplicateParagraphs(uuids) {
      if (uuids.length === 1) {
        return useGraphqlMutation('duplicateParagraph', {
          ...ctx,
          uuid: uuids[0],
        })
      }
      return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
        ...ctx,
        uuids,
      })
    },
    convertParagraphs(uuids, targetBundle) {
      if (uuids.length === 1) {
        return useGraphqlMutation('convertParagraph', {
          ...ctx,
          uuid: uuids[0],
          targetBundle,
        })
      }
      return useGraphqlMutation('pbConvertMultiple', {
        ...ctx,
        uuids,
        targetBundle,
      })
    },
    deleteMultipleParagraphs(uuids) {
      return useGraphqlMutation('deleteMultipleParagraphs', {
        ...ctx,
        uuids,
      })
    },
    deleteParagraph(uuid) {
      return useGraphqlMutation('deleteParagraph', {
        ...ctx,
        uuid,
      })
    },
    addReusableParagraph(e) {
      return useGraphqlMutation('addReusableParagraph', {
        ...ctx,
        libraryItemId: e.item.libraryItemId,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })
    },
    moveMultipleParagraphs(e) {
      return useGraphqlMutation('moveMultipleParagraphs', {
        ...ctx,
        uuids: e.uuids,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })
    },
    moveParagraph(e) {
      return useGraphqlMutation('moveParagraph', {
        ...ctx,
        uuid: e.item.uuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })
    },
    addClipboardParagraph(e) {
      if (e.item.paragraphType === 'text') {
        return useGraphqlMutation('addTextParagraph', {
          ...ctx,
          text: e.item.clipboardData,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        })
      } else if (e.item.paragraphType === 'video_remote') {
        return useGraphqlMutation('addVideoRemoteParagraph', {
          ...ctx,
          url: 'http://www.youtube.com/watch?v=' + e.item.clipboardData,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        })
      } else if (e.item.paragraphType === 'image') {
        return useGraphqlMutation('addImageParagraph', {
          ...ctx,
          data: e.item.clipboardData,
          fileName: e.item.additional || '',
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        })
      }
    },
    addNewParagraph(e) {
      return useGraphqlMutation('addParagraph', {
        ...ctx,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.type,
      })
    },
    updateParagraphOptions(options) {
      if (options.length === 1) {
        return useGraphqlMutation('updateParagraphOption', {
          ...ctx,
          ...options[0],
        })
      }
      const persistItems = options.map((v) => {
        return {
          uuid: v.uuid,
          key: v.key,
          value: v.value,
          pluginId: 'paragraph_builder_data',
        }
      })
      return useGraphqlMutation('bulkUpdateParagraphBehaviorSettings', {
        ...ctx,
        items: persistItems,
      })
    },
    mapState(state) {
      const currentIndex =
        state?.currentIndex === null || state?.currentIndex === undefined
          ? -1
          : state.currentIndex
      const mutations = state?.mutations || []
      const currentUserIsOwner = !!state?.currentUserIsOwner
      const ownerName = state?.ownerName || ''
      const mutatedState = state?.mutatedState || {}
      const entity = state?.entity
      const translationState = state?.translationState || {}
      const previewUrl = state?.previewUrl || ''

      const entityTranslations =
        entity && 'translations' in entity
          ? entity.translations
              ?.map((v) => {
                if (v.langcode && 'url' in v && v.url?.path) {
                  return {
                    langcode: v.langcode,
                    url: v.url.path,
                    status: 'status' in v ? !!v.status : true,
                  }
                }
                return null
              })
              .filter(falsy) || []
          : []

      const bundleLabel = state?.bundleLabel || ''

      const editUrl =
        state?.entity && 'editUrl' in state.entity
          ? state.entity.editUrl?.path
          : ''

      return {
        currentIndex,
        mutations,
        currentUserIsOwner,
        ownerName,
        mutatedState,
        entity: {
          ...(entity || {}),
          translations: entityTranslations,
          bundleLabel,
          editUrl,
        },
        translationState,
        entityTranslations,
        previewUrl,
      }
    },
  }
}

export default getDrupalAdapter
