import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'
import { falsy } from '#blokkli/helpers'
import {
  BlokkliEntityTranslation,
  BlokkliTranslationState,
  BlokkliItemType,
} from '#blokkli/types'
import { BlokkliAdapter, defineBlokkliEditAdapter } from '#blokkli/adapter'

type DrupalAdapter = BlokkliAdapter<ParagraphsBuilderEditStateFragment>

export default defineBlokkliEditAdapter<ParagraphsBuilderEditStateFragment>(
  (providedContext) => {
    const optionsPluginId = useRuntimeConfig().public.blokkli.optionsPluginId
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

    const getAvailableTypes: DrupalAdapter['getAvailableTypes'] = () =>
      useGraphqlQuery('pbAllowedTypes').then(
        (v) => v.data.paragraphsBuilderAllowedTypes || [],
      )

    const getAllTypes: DrupalAdapter['getAllTypes'] = () =>
      useGraphqlQuery('pbAllTypes').then((v) => {
        const allTypes = v.data.entityQuery.items?.filter(
          (v) => v && 'icon' in v,
        ) as BlokkliItemType[]
        return allTypes
      })

    const loadState: DrupalAdapter['loadState'] = (langcode) =>
      useGraphqlQuery('pbEditState', {
        ...ctx.value,
        langcode: langcode || undefined,
      }).then((v) => v.data.state)

    const getDisabledFeatures: DrupalAdapter['getDisabledFeatures'] =
      async () => {
        const data = await useGraphqlQuery('pbAvailableFeatures').then(
          (v) => v.data.features,
        )
        const disabled: string[] = []
        const mutations = data?.mutations || []
        if (!data?.comment) {
          disabled.push('Comments')
        }
        if (!data?.conversion) {
          disabled.push('Conversions')
        }
        if (!data?.library) {
          disabled.push('Library')
        }
        if (!mutations.includes('duplicate')) {
          disabled.push('Duplicate')
        }
        return disabled
      }

    const takeOwnership: DrupalAdapter['takeOwnership'] = () =>
      useGraphqlMutation('pbTakeOwnership', ctx.value)

    const setHistoryIndex: DrupalAdapter['setHistoryIndex'] = (index) =>
      useGraphqlMutation('pbSetHistoryIndex', {
        ...ctx.value,
        index,
      })

    const redo: DrupalAdapter['redo'] = () =>
      useGraphqlMutation('pbRedo', ctx.value)

    const undo: DrupalAdapter['undo'] = () =>
      useGraphqlMutation('pbUndo', ctx.value)

    const publish: DrupalAdapter['publish'] = () =>
      useGraphqlMutation('pbPublish', ctx.value)

    const importFromExisting: DrupalAdapter['importFromExisting'] = (e) =>
      useGraphqlMutation('pbCopyFromExisting', {
        ...ctx.value,
        sourceUuid: e.sourceUuid,
        fields: e.sourceFields,
      })

    const revertAllChanges: DrupalAdapter['revertAllChanges'] = () =>
      useGraphqlMutation('pbRevertAllChanges', ctx.value)

    const makeItemReusable: DrupalAdapter['makeItemReusable'] = (e) =>
      useGraphqlMutation('pbMakeParagraphReusable', {
        ...ctx.value,
        ...e,
      })

    const duplicateItems: DrupalAdapter['duplicateItems'] = (uuids) => {
      if (uuids.length === 1) {
        return useGraphqlMutation('pbDuplicateParagraph', {
          ...ctx.value,
          uuid: uuids[0],
        })
      }
      return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
        ...ctx.value,
        uuids,
      })
    }

    const convertItems: DrupalAdapter['convertItems'] = (
      uuids,
      targetBundle,
    ) => {
      if (uuids.length === 1) {
        return useGraphqlMutation('pbConvertParagraph', {
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

    const deleteMultipleItems: DrupalAdapter['deleteMultipleItems'] = (uuids) =>
      useGraphqlMutation('pbDeleteMultipleParagraphs', {
        ...ctx.value,
        uuids,
      })

    const deleteItem: DrupalAdapter['deleteItem'] = (uuid) =>
      useGraphqlMutation('pbDeleteParagraph', {
        ...ctx.value,
        uuid,
      })

    const addReusableItem: DrupalAdapter['addReusableItem'] = (e) =>
      useGraphqlMutation('pbAddReusableParagraph', {
        ...ctx.value,
        libraryItemUuid: e.item.libraryItemUuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })

    const moveMultipleItems: DrupalAdapter['moveMultipleItems'] = (e) =>
      useGraphqlMutation('pbMoveMultipleItems', {
        ...ctx.value,
        uuids: e.uuids,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })

    const moveItem: DrupalAdapter['moveItem'] = (e) =>
      useGraphqlMutation('pbMoveParagraph', {
        ...ctx.value,
        uuid: e.item.uuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      })

    const addNewBlokkliItem: DrupalAdapter['addNewBlokkliItem'] = (e) =>
      useGraphqlMutation('pbAddParagraph', {
        ...ctx.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.type,
      })

    const updateOptions: DrupalAdapter['updateOptions'] = (options) => {
      if (options.length === 1) {
        return useGraphqlMutation('pbUpdateParagraphOption', {
          ...ctx.value,
          ...options[0],
          pluginId: optionsPluginId,
        })
      }
      const persistItems = options.map((v) => {
        return {
          uuid: v.uuid,
          key: v.key,
          value: v.value,
          pluginId: optionsPluginId,
        }
      })
      return useGraphqlMutation('pbBulkUpdateParagraphBehaviorSettings', {
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

      const translations: BlokkliEntityTranslation[] =
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

      const translationState: BlokkliTranslationState = {
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
      useGraphqlQuery('pbComments', ctx.value).then(
        (v) => v.data.state?.comments || [],
      )

    const addComment: DrupalAdapter['addComment'] = (itemUuids, body) =>
      useGraphqlMutation('pbAddComment', {
        ...ctx.value,
        itemUuids,
        body,
      }).then((v) => v.data.state?.action || [])

    const resolveComment: DrupalAdapter['resolveComment'] = (uuid) =>
      useGraphqlMutation('pbResolveComment', {
        ...ctx.value,
        uuid,
      }).then((v) => v.data.state?.action || [])

    const getLibraryItems: DrupalAdapter['getLibraryItems'] = () =>
      useGraphqlQuery('pbLibraryItems').then((response) => {
        return (
          response.data.entityQuery.items
            ?.map((v) => {
              if (v && 'uuid' in v && v.uuid) {
                const paragraph = v.paragraphs?.list?.[0]
                const bundle = paragraph?.item?.entityBundle
                if (bundle && paragraph && paragraph.props && paragraph.item) {
                  return {
                    uuid: v.uuid,
                    label: v.label,
                    bundle,
                    item: paragraph.item,
                    props: paragraph.props,
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

    const getTransformPlugins: DrupalAdapter['getTransformPlugins'] = () =>
      useGraphqlQuery('pbGetTransformPlugins')
        .then((v) => v.data.paragraphsBuilderGetTransformPlugins || [])
        .then((plugins) =>
          plugins.map((plugin) => {
            return {
              id: plugin.id,
              label: plugin.label,
              bundles: plugin.bundles,
              min: plugin.min,
              max: plugin.max,
            }
          }),
        )

    const applyTransformPlugin: DrupalAdapter['applyTransformPlugin'] = (e) =>
      useGraphqlMutation('pbApplyTransformPlugin', {
        ...ctx.value,
        ...e,
      })

    return {
      getTransformPlugins,
      applyTransformPlugin,
      getImportItems,
      getConversions,
      getAvailableTypes,
      getAllTypes,
      loadState,
      getDisabledFeatures,
      takeOwnership,
      setHistoryIndex,
      redo,
      undo,
      publish,
      importFromExisting,
      revertAllChanges,
      makeItemReusable,
      duplicateItems,
      convertItems,
      deleteMultipleItems,
      deleteItem,
      addReusableItem,
      moveMultipleItems,
      moveItem,
      addNewBlokkliItem,
      updateOptions,
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
