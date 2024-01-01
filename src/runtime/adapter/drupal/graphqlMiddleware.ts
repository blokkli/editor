// @ts-nocheck
import type { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'
import { falsy } from '#blokkli/helpers'
import type {
  BlokkliEntityTranslation,
  BlokkliTranslationState,
  BlokkliItemType,
} from '#blokkli/types'
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { BlokkliAdapter } from '#blokkli/adapter'

type DrupalAdapter = BlokkliAdapter<ParagraphsBuilderEditStateFragment>

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

    const getAvailableTypes: DrupalAdapter['getAvailableTypes'] = () =>
      useGraphqlQuery('pbAllowedTypes').then(
        (v) => v.data.paragraphsBuilderAllowedTypes || [],
      )

    const getAllBundles: DrupalAdapter['getAllBundles'] = () =>
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

    const duplicateBlocks: DrupalAdapter['duplicateBlocks'] = (uuids) => {
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

    const convertBlocks: DrupalAdapter['convertBlocks'] = (
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

    const deleteBlocks: DrupalAdapter['deleteBlocks'] = (uuids) =>
      useGraphqlMutation('pbDeleteMultipleParagraphs', {
        ...ctx.value,
        uuids,
      })

    const addLibraryItem: DrupalAdapter['addLibraryItem'] = (e) =>
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

    const addNewBlock: DrupalAdapter['addNewBlock'] = (e) =>
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
        })
      }
      const persistItems = options.map((v) => {
        return {
          uuid: v.uuid,
          key: v.key,
          value: v.value,
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
              targetBundles: plugin.targetBundles,
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

    function getFrameUrlQuery(prefix: string) {
      return `?paragraphsBuilder=true&destination=${prefix}/paragraphs_builder/redirect`
    }

    const buildFormUrl = (langcode: string, parts: string | string[]) => {
      const prefix = `/${langcode}`
      const url = typeof parts === 'string' ? parts : parts.join('/')
      return { url: prefix + '/' + url + getFrameUrlQuery(prefix) }
    }

    const formFrameBuilder: DrupalAdapter['formFrameBuilder'] = (e) => {
      if (e.form === 'block:add') {
        return buildFormUrl(ctx.value.language, [
          'paragraphs_builder',
          ctx.value.entityType,
          ctx.value.entityUuid,
          'add',
          e.data.type,
          e.data.host.type,
          e.data.host.uuid,
          e.data.host.fieldName,
          e.data.afterUuid,
        ])
      } else if (e.form === 'block:edit' || e.form === 'block:translate') {
        return buildFormUrl(
          ctx.value.language,
          `/paragraphs_builder/${ctx.value.entityType}/${ctx.value.entityUuid}/edit/${e.data.uuid}`,
        )
      } else if (e.form === 'entity:edit') {
        return buildFormUrl(ctx.value.language, [
          ctx.value.entityType,
          'edit',
          ctx.value.entityUuid,
        ])
      } else if (e.form === 'batchTranslate') {
        buildFormUrl(
          ctx.value.language,
          `/paragraphs_builder/${ctx.value.entityType}/${ctx.value.entityUuid}/translate-paragraphs`,
        )
      }
    }

    return {
      getTransformPlugins,
      applyTransformPlugin,
      getImportItems,
      getConversions,
      getAvailableTypes,
      getAllBundles,
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
      duplicateBlocks,
      convertBlocks,
      deleteMultipleItems,
      addLibraryItem,
      moveMultipleItems,
      moveItem,
      addNewBlock,
      updateOptions,
      mapState,
      loadComments,
      addComment,
      resolveComment,
      getLibraryItems,
      getLastChanged,
      getPreviewGrantUrl,
      formFrameBuilder,
      deleteBlocks,
    }
  },
)
