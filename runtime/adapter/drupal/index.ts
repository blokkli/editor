import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'
import { falsy } from '../../components/Edit/helpers'
import { PbType } from '../../types'
import { PbAdapter } from '../../types/adapter'

type PbAdapterContext = {
  entityType: string
  entityUuid: string
}

type PbAdapterFactory<T> = (ctx: PbAdapterContext) => PbAdapter<T>

type DrupalAdapter = PbAdapter<ParagraphsBuilderEditStateFragment>

const getDrupalAdapter: PbAdapterFactory<ParagraphsBuilderEditStateFragment> = (
  providedContext,
) => {
  const ctx = {
    entityType: providedContext.entityType.toUpperCase() as any,
    entityUuid: providedContext.entityUuid,
  }

  const getImportItems: DrupalAdapter['getImportItems'] = (
    searchText: string,
  ) =>
    useGraphqlQuery('pbGetImportSourceEntities', {
      entityType: (ctx.entityType as string).toLowerCase(),
      entityUuid: ctx.entityUuid,
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
      ...ctx,
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
    useGraphqlMutation('paragraphsBuilderTakeOwnership', ctx)

  const setHistoryIndex: DrupalAdapter['setHistoryIndex'] = (index) =>
    useGraphqlMutation('paragraphsBuilderSetHistoryIndex', {
      ...ctx,
      index,
    })

  const redo: DrupalAdapter['redo'] = () =>
    useGraphqlMutation('paragraphsBuilderRedo', ctx)

  const undo: DrupalAdapter['undo'] = () =>
    useGraphqlMutation('paragraphsBuilderUndo', ctx)

  const publish: DrupalAdapter['publish'] = () =>
    useGraphqlMutation('paragraphsBuilderPublish', ctx)

  const importFromExisting: DrupalAdapter['importFromExisting'] = (e) =>
    useGraphqlMutation('pbCopyFromExisting', {
      ...ctx,
      sourceUuid: e.sourceUuid,
      fields: e.sourceFields,
    })

  const revertAllChanges: DrupalAdapter['revertAllChanges'] = () =>
    useGraphqlMutation('revertAllChanges', ctx)

  const makeParagraphReusable: DrupalAdapter['makeParagraphReusable'] = (e) =>
    useGraphqlMutation('makeParagraphReusable', {
      ...ctx,
      ...e,
    })

  const duplicateParagraphs: DrupalAdapter['duplicateParagraphs'] = (uuids) => {
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
  }

  const convertParagraphs: DrupalAdapter['convertParagraphs'] = (
    uuids,
    targetBundle,
  ) => {
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
  }

  const deleteMultipleParagraphs: DrupalAdapter['deleteMultipleParagraphs'] = (
    uuids,
  ) =>
    useGraphqlMutation('deleteMultipleParagraphs', {
      ...ctx,
      uuids,
    })

  const deleteParagraph: DrupalAdapter['deleteParagraph'] = (uuid) =>
    useGraphqlMutation('deleteParagraph', {
      ...ctx,
      uuid,
    })

  const addReusableParagraph: DrupalAdapter['addReusableParagraph'] = (e) =>
    useGraphqlMutation('addReusableParagraph', {
      ...ctx,
      libraryItemUuid: e.item.libraryItemUuid,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    })

  const moveMultipleParagraphs: DrupalAdapter['moveMultipleParagraphs'] = (e) =>
    useGraphqlMutation('moveMultipleParagraphs', {
      ...ctx,
      uuids: e.uuids,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    })

  const moveParagraph: DrupalAdapter['moveParagraph'] = (e) =>
    useGraphqlMutation('moveParagraph', {
      ...ctx,
      uuid: e.item.uuid,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    })

  const addClipboardParagraph: DrupalAdapter['addClipboardParagraph'] = (e) => {
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
  }

  const addNewParagraph: DrupalAdapter['addNewParagraph'] = (e) =>
    useGraphqlMutation('addParagraph', {
      ...ctx,
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
  }

  const loadComments: DrupalAdapter['loadComments'] = () =>
    useGraphqlQuery('paragraphsBuilderComments', ctx).then(
      (v) => v.data.state?.comments || [],
    )

  const addComment: DrupalAdapter['addComment'] = (paragraphUuid, body) =>
    useGraphqlMutation('paragraphsBuilderAddComment', {
      ...ctx,
      targetUuid: paragraphUuid,
      body,
    }).then((v) => v.data.state?.action || [])

  const resolveComment: DrupalAdapter['resolveComment'] = (uuid) =>
    useGraphqlMutation('paragraphsBuilderResolveComment', {
      ...ctx,
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
      `/paragraphs_builder/${ctx.entityType}/${ctx.entityUuid}/last_changed`,
    ).then((v) => v.changed)

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
    addClipboardParagraph,
    addNewParagraph,
    updateParagraphOptions,
    mapState,
    loadComments,
    addComment,
    resolveComment,
    getLibraryItems,
    getLastChanged,
  }
}

export default getDrupalAdapter
