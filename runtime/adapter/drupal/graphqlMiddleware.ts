import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'
import { falsy } from '#pb/helpers'
import { PbAvailableTranslation, PbTranslationState, PbType } from '#pb/types'
import { PbAdapter, defineBlokkliEditAdapter } from '#blokkli/adapter'

type DrupalAdapter = PbAdapter<ParagraphsBuilderEditStateFragment>

export default defineBlokkliEditAdapter<ParagraphsBuilderEditStateFragment>(
  (providedContext) => {
    const ctx = computed(() => {
      return {
        ...providedContext.value,
        entityType: providedContext.value.entityType.toUpperCase() as any,
      }
    })

    const getImportItems: DrupalAdapter['getImportItems'] = (
      searchText: string,
    ) =>
      useGraphqlQuery('pbGetImportSourceEntities', {
        entityType: (ctx.value.entityType as string).toLowerCase(),
        entityUuid: ctx.value.entityUuid,
        searchText,
      }).then((data) => {
        return {
          total: data.data.pbGetImportSourceEntities?.total || 0,
          items: data.data.pbGetImportSourceEntities?.items || [],
        }
      })

    const getConversions: DrupalAdapter['getConversions'] = () =>
      useGraphqlQuery('pbConversions').then(
        (v) => v.data.paragraphsBuilderConversions || [],
      )

    const getAvailableParagraphTypes: DrupalAdapter['getAvailableParagraphTypes'] =
      () =>
        useGraphqlQuery('pbAllowedTypes').then(
          (v) => v.data.paragraphsBuilderAllowedTypes || [],
        )

    const getAllParagraphTypes: DrupalAdapter['getAllParagraphTypes'] = () =>
      useGraphqlQuery('pbAllTypes').then((v) => {
        const allTypes = v.data.entityQuery.items?.filter(
          (v) => v && 'icon' in v,
        ) as PbType[]
        return allTypes
      })

    const loadState: DrupalAdapter['loadState'] = (langcode) =>
      useGraphqlQuery('paragraphsEditState', {
        ...ctx.value,
        langcode: langcode || undefined,
      }).then((v) => v.data.state)

    const getAvailableFeatures: DrupalAdapter['getAvailableFeatures'] =
      async () => {
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
      }

    const takeOwnership: DrupalAdapter['takeOwnership'] = () =>
      useGraphqlMutation('paragraphsBuilderTakeOwnership', ctx.value)

    const setHistoryIndex: DrupalAdapter['setHistoryIndex'] = (index) =>
      useGraphqlMutation('paragraphsBuilderSetHistoryIndex', {
        ...ctx.value,
        index,
      })

    const redo: DrupalAdapter['redo'] = () =>
      useGraphqlMutation('paragraphsBuilderRedo', ctx.value)

    const undo: DrupalAdapter['undo'] = () =>
      useGraphqlMutation('paragraphsBuilderUndo', ctx.value)

    const publish: DrupalAdapter['publish'] = () =>
      useGraphqlMutation('paragraphsBuilderPublish', ctx.value)

    const importFromExisting: DrupalAdapter['importFromExisting'] = (e) =>
      useGraphqlMutation('pbCopyFromExisting', {
        ...ctx.value,
        sourceUuid: e.sourceUuid,
        fields: e.sourceFields,
      })

    const revertAllChanges: DrupalAdapter['revertAllChanges'] = () =>
      useGraphqlMutation('revertAllChanges', ctx.value)

    const makeParagraphReusable: DrupalAdapter['makeParagraphReusable'] = (e) =>
      useGraphqlMutation('makeParagraphReusable', {
        ...ctx.value,
        ...e,
      })

    const duplicateParagraphs: DrupalAdapter['duplicateParagraphs'] = (
      uuids,
    ) => {
      if (uuids.length === 1) {
        return useGraphqlMutation('duplicateParagraph', {
          ...ctx.value,
          uuid: uuids[0],
        })
      }
      return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
        ...ctx.value,
        uuids,
      })
    }

    const convertParagraphs: DrupalAdapter['convertParagraphs'] = (
      uuids,
      targetBundle,
    ) => {
      if (uuids.length === 1) {
        return useGraphqlMutation('convertParagraph', {
          ...ctx.value,
          uuid: uuids[0],
          targetBundle,
        })
      }
      return useGraphqlMutation('pbConvertMultiple', {
        ...ctx.value,
        uuids,
        targetBundle,
      })
    }

    const deleteMultipleParagraphs: DrupalAdapter['deleteMultipleParagraphs'] =
      (uuids) =>
        useGraphqlMutation('deleteMultipleParagraphs', {
          ...ctx.value,
          uuids,
        })

    const deleteParagraph: DrupalAdapter['deleteParagraph'] = (uuid) =>
      useGraphqlMutation('deleteParagraph', {
        ...ctx.value,
        uuid,
      })

    const addReusableParagraph: DrupalAdapter['addReusableParagraph'] = (e) =>
      useGraphqlMutation('addReusableParagraph', {
        ...ctx.value,
        libraryItemUuid: e.item.libraryItemUuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })

    const moveMultipleParagraphs: DrupalAdapter['moveMultipleParagraphs'] = (
      e,
    ) =>
      useGraphqlMutation('moveMultipleParagraphs', {
        ...ctx.value,
        uuids: e.uuids,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })

    const moveParagraph: DrupalAdapter['moveParagraph'] = (e) =>
      useGraphqlMutation('moveParagraph', {
        ...ctx.value,
        uuid: e.item.uuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })

    const addNewParagraph: DrupalAdapter['addNewParagraph'] = (e) =>
      useGraphqlMutation('addParagraph', {
        ...ctx.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.type,
      })

    const updateParagraphOptions: DrupalAdapter['updateParagraphOptions'] = (
      options,
    ) => {
      if (options.length === 1) {
        return useGraphqlMutation('updateParagraphOption', {
          ...ctx.value,
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
        ...ctx.value,
        items: persistItems,
      })
    }

    const mapState: DrupalAdapter['mapState'] = (state) => {
      const currentIndex =
        state?.currentIndex === null || state?.currentIndex === undefined
          ? -1
          : state.currentIndex
      const mutations = state?.mutations || []
      const currentUserIsOwner = !!state?.currentUserIsOwner
      const ownerName = state?.ownerName || ''
      const mutatedState = state?.mutatedState || {}
      const entity = state?.entity

      const translations: PbAvailableTranslation[] =
        entity && 'translations' in entity
          ? entity.translations
              ?.map((v) => {
                if (v.langcode && 'url' in v && v.url?.path) {
                  return {
                    id: v.langcode,
                    url: v.url.path,
                    status: 'status' in v ? !!v.status : true,
                  }
                }
                return null
              })
              .filter(falsy) || []
          : []

      const translationState: PbTranslationState = {
        isTranslatable: !!state.translationState?.isTranslatable,
        sourceLanguage: state.translationState?.sourceLanguage || '',
        availableLanguages: state.translationState?.availableLanguages || [],
        translations,
      }

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
          bundleLabel,
          editUrl,
        },
        translationState,
      }
    }

    const loadComments: DrupalAdapter['loadComments'] = () =>
      useGraphqlQuery('paragraphsBuilderComments', ctx.value).then(
        (v) => v.data.state?.comments || [],
      )

    const addComment: DrupalAdapter['addComment'] = (paragraphUuids, body) =>
      useGraphqlMutation('paragraphsBuilderAddComment', {
        ...ctx.value,
        paragraphUuids,
        body,
      }).then((v) => v.data.state?.action || [])

    const resolveComment: DrupalAdapter['resolveComment'] = (uuid) =>
      useGraphqlMutation('paragraphsBuilderResolveComment', {
        ...ctx.value,
        uuid,
      }).then((v) => v.data.state?.action || [])

    const getLibraryItems: DrupalAdapter['getLibraryItems'] = () =>
      useGraphqlQuery('paragraphsBuilderLibraryItems').then((response) => {
        return (
          response.data.entityQuery.items
            ?.map((v) => {
              if (v && 'uuid' in v && v.uuid) {
                const paragraph = v.paragraphs?.list?.[0]
                const bundle = paragraph?.item?.entityBundle
                if (
                  bundle &&
                  paragraph &&
                  paragraph.paragraph &&
                  paragraph.item
                ) {
                  return {
                    uuid: v.uuid,
                    label: v.label,
                    bundle,
                    item: paragraph.item,
                    paragraph: paragraph.paragraph,
                  }
                }
              }
            })
            .filter(falsy) || []
        )
      })

    const getLastChanged: DrupalAdapter['getLastChanged'] = () =>
      $fetch<{ changed: number }>(
        `/paragraphs_builder/${ctx.value.entityType}/${ctx.value.entityUuid}/last_changed`,
      ).then((v) => v.changed)

    const getPreviewGrantUrl: DrupalAdapter['getPreviewGrantUrl'] = () =>
      useGraphqlQuery('pbGetPreviewGrantUrl', ctx.value).then(
        (v) => v.data.getParagraphsEditState?.previewUrl,
      )

    return {
      getImportItems,
      getConversions,
      getAvailableParagraphTypes,
      getAllParagraphTypes,
      loadState,
      getAvailableFeatures,
      takeOwnership,
      setHistoryIndex,
      redo,
      undo,
      publish,
      importFromExisting,
      revertAllChanges,
      makeParagraphReusable,
      duplicateParagraphs,
      convertParagraphs,
      deleteMultipleParagraphs,
      deleteParagraph,
      addReusableParagraph,
      moveMultipleParagraphs,
      moveParagraph,
      addNewParagraph,
      updateParagraphOptions,
      mapState,
      loadComments,
      addComment,
      resolveComment,
      getLibraryItems,
      getLastChanged,
      getPreviewGrantUrl,
    }
  },
)
