// @ts-nocheck
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import { falsy } from '#blokkli/helpers'
import { useGraphqlQuery, useGraphqlMutation, computed } from '#imports'
import type { BlokkliAdapter } from '#blokkli/adapter'
import {
  ParagraphsBlokkliCommentFragment,
  ParagraphsBlokkliEditStateFragment,
} from '#build/graphql-operations'
import type { BlockBundleDefinition, TranslationState } from '#blokkli/types'

type DrupalAdapter = BlokkliAdapter<ParagraphsBlokkliEditStateFragment>

export default defineBlokkliEditAdapter<ParagraphsBlokkliEditStateFragment>(
  (providedContext) => {
    const ctx = computed(() => {
      return {
        ...providedContext.value,
        entityType: providedContext.value.entityType.toUpperCase() as any,
      }
    })

    const getImportItems: DrupalAdapter['getImportItems'] = (
      searchText?: string,
    ) =>
      useGraphqlQuery('pbGetImportSourceEntities', {
        entityType: (ctx.value.entityType as string).toLowerCase(),
        entityUuid: ctx.value.entityUuid,
        searchText,
      }).then((data) => {
        return {
          total: data?.data.pbGetImportSourceEntities?.total || 0,
          items: (data?.data.pbGetImportSourceEntities?.items || []).map(
            (item) => {
              return {
                uuid: item.uuid,
                label: item.label || item.uuid,
              }
            },
          ),
        }
      })

    const getConversions: DrupalAdapter['getConversions'] = () =>
      useGraphqlQuery('pbConversions').then(
        (v) => v?.data.paragraphsBlokkliConversions || [],
      )

    const getAllBundles: DrupalAdapter['getAllBundles'] = () =>
      useGraphqlQuery('pbAllTypes').then((v) => {
        const allTypes = v.data.entityQuery.items?.filter(
          (v) => v && 'icon' in v,
        ) as BlockBundleDefinition[]
        return allTypes
      })

    const loadState: DrupalAdapter['loadState'] = (langcode) =>
      useGraphqlQuery('pbEditState', {
        ...ctx.value,
        langcode: langcode || undefined,
      }).then((v) => v?.data.state)

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

    const mapMutation = (v: any) => v.data.state.action

    const takeOwnership: DrupalAdapter['takeOwnership'] = () =>
      useGraphqlMutation('pbTakeOwnership', ctx.value).then(mapMutation)

    const setHistoryIndex: DrupalAdapter['setHistoryIndex'] = (index) =>
      useGraphqlMutation('pbSetHistoryIndex', {
        ...ctx.value,
        index,
      }).then(mapMutation)

    const publish: DrupalAdapter['publish'] = () =>
      useGraphqlMutation('pbPublish', ctx.value).then(mapMutation)

    const importFromExisting: DrupalAdapter['importFromExisting'] = (e) =>
      useGraphqlMutation('pbCopyFromExisting', {
        ...ctx.value,
        sourceUuid: e.sourceUuid,
        fields: e.sourceFields,
      }).then(mapMutation)

    const revertAllChanges: DrupalAdapter['revertAllChanges'] = () =>
      useGraphqlMutation('pbRevertAllChanges', ctx.value).then(mapMutation)

    const makeBlockReusable: DrupalAdapter['makeBlockReusable'] = (e) =>
      useGraphqlMutation('pbMakeParagraphReusable', {
        ...ctx.value,
        ...e,
      }).then(mapMutation)

    const duplicateBlocks: DrupalAdapter['duplicateBlocks'] = (uuids) => {
      if (uuids.length === 1) {
        return useGraphqlMutation('pbDuplicateParagraph', {
          ...ctx.value,
          uuid: uuids[0],
        }).then(mapMutation)
      }
      return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
        ...ctx.value,
        uuids,
      }).then(mapMutation)
    }

    const pasteExistingBlocks: DrupalAdapter['pasteExistingBlocks'] = (e) => {
      return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
        ...ctx.value,
        uuids: e.uuids,
        afterUuid: e.preceedingUuid,
      }).then(mapMutation)
    }

    const detachReusableBlock: DrupalAdapter['detachReusableBlock'] = (e) => {
      return useGraphqlMutation('pbDetachReusableParagraph', {
        ...ctx.value,
        uuids: e.uuids,
      }).then(mapMutation)
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
        }).then(mapMutation)
      }
      return useGraphqlMutation('pbConvertMultiple', {
        ...ctx.value,
        uuids,
        targetBundle,
      }).then(mapMutation)
    }

    const deleteBlocks: DrupalAdapter['deleteBlocks'] = (uuids) =>
      useGraphqlMutation('pbDeleteMultipleParagraphs', {
        ...ctx.value,
        uuids,
      }).then(mapMutation)

    const addLibraryItem: DrupalAdapter['addLibraryItem'] = (e) =>
      useGraphqlMutation('pbAddReusableParagraph', {
        ...ctx.value,
        libraryItemUuid: e.libraryItemUuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }).then(mapMutation)

    const moveMultipleBlocks: DrupalAdapter['moveMultipleBlocks'] = (e) =>
      useGraphqlMutation('pbMoveMultipleItems', {
        ...ctx.value,
        uuids: e.uuids,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }).then(mapMutation)

    const moveBlock: DrupalAdapter['moveBlock'] = (e) =>
      useGraphqlMutation('pbMoveParagraph', {
        ...ctx.value,
        uuid: e.item.uuid,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }).then(mapMutation)

    const addNewBlock: DrupalAdapter['addNewBlock'] = (e) =>
      useGraphqlMutation('pbAddParagraph', {
        ...ctx.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.bundle,
      }).then(mapMutation)

    const updateOptions: DrupalAdapter['updateOptions'] = (options) => {
      if (options.length === 1) {
        return useGraphqlMutation('pbUpdateParagraphOption', {
          ...ctx.value,
          uuid: options[0].uuid,
          key: options[0].key,
          value: options[0].value,
          pluginId: 'paragraphs_blokkli_data',
        }).then(mapMutation)
      }
      const persistItems = options.map((v) => {
        return {
          uuid: v.uuid,
          key: v.key,
          value: v.value,
          pluginId: 'paragraphs_blokkli_data',
        }
      })
      return useGraphqlMutation('pbBulkUpdateParagraphBehaviorSettings', {
        ...ctx.value,
        items: persistItems,
      }).then(mapMutation)
    }

    const mapState: DrupalAdapter['mapState'] = (state) => {
      const currentIndex =
        state?.currentIndex === null || state?.currentIndex === undefined
          ? -1
          : state.currentIndex
      const mutations = state?.mutations || []
      const currentUserIsOwner = !!state?.currentUserIsOwner
      const ownerName = state?.ownerName || ''
      const fields = state?.mutatedState?.fields || []
      const violations = state.mutatedState?.violations || []
      const entity = state?.entity

      // The options are in the form of:
      // uuid: {
      //   paragraphs_blokkli_data: {
      //     key: 'value'
      //   }
      // }
      const mutatedOptions = state.mutatedState?.mutatedOptions || {}
      Object.keys(mutatedOptions).forEach((uuid) => {
        mutatedOptions[uuid] =
          mutatedOptions[uuid]?.paragraphs_blokkli_data || {}
      })

      const translationState: TranslationState = {
        isTranslatable: !!state.translationState?.isTranslatable,
        sourceLanguage: state.translationState?.sourceLanguage || '',
        availableLanguages: state.translationState?.availableLanguages || [],
        translations: state.translationState?.translations || [],
      }

      return {
        currentIndex,
        mutations,
        currentUserIsOwner,
        ownerName,
        mutatedState: {
          fields,
          violations,
          mutatedOptions,
        },
        entity,
        mutatedEntity: state.mutatedEntity,
        translationState,
      }
    }

    const mapComments = (
      comments: Array<ParagraphsBlokkliCommentFragment | {}>,
    ) =>
      comments
        .map((item) => {
          if ('uuid' in item) {
            return {
              uuid: item.uuid,
              blockUuids: item.blockUuids || [],
              resolved: !!item.resolved,
              body: item.body || '',
              created: item.created?.first?.value || '',
              user: {
                label: item.user?.label || '',
              },
            }
          }
          return null
        })
        .filter(falsy)

    const loadComments: DrupalAdapter['loadComments'] = () =>
      useGraphqlQuery('pbComments', ctx.value).then((v) =>
        mapComments(v.data.state?.comments || []),
      )

    const addComment: DrupalAdapter['addComment'] = (blockUuids, body) =>
      useGraphqlMutation('pbAddComment', {
        ...ctx.value,
        blockUuids,
        body,
      }).then((v) => mapComments(v.data.state?.action || []))

    const resolveComment: DrupalAdapter['resolveComment'] = (uuid) =>
      useGraphqlMutation('pbResolveComment', {
        ...ctx.value,
        uuid,
      }).then((v) => mapComments(v.data.state?.action || []))

    const getLibraryItems: DrupalAdapter['getLibraryItems'] = () =>
      useGraphqlQuery('pbLibraryItems').then((response) => {
        return (
          response.data.entityQuery.items
            ?.map((v) => {
              if (v && 'uuid' in v && v.uuid) {
                const paragraph = v.paragraphs
                const bundle = paragraph?.bundle
                if (bundle && paragraph && paragraph.props && paragraph) {
                  return {
                    uuid: v.uuid,
                    label: v.label,
                    bundle,
                    item: paragraph,
                  }
                }
              }
              return null
            })
            .filter(falsy) || []
        )
      })

    const getLastChanged: DrupalAdapter['getLastChanged'] = () =>
      $fetch<{ changed: number }>(
        `/paragraphs_blokkli/${ctx.value.entityType}/${ctx.value.entityUuid}/last_changed`,
      ).then((v) => v.changed)

    const getPreviewGrantUrl: DrupalAdapter['getPreviewGrantUrl'] = () =>
      useGraphqlQuery('pbGetPreviewGrantUrl', ctx.value).then(
        (v) => v.data.getParagraphsEditState?.previewUrl,
      )

    const getTransformPlugins: DrupalAdapter['getTransformPlugins'] = () =>
      useGraphqlQuery('pbGetTransformPlugins')
        .then((v) => v.data.paragraphsBlokkliGetTransformPlugins || [])
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
      }).then(mapMutation)

    const buildFormUrl = (parts: string | string[]) => {
      const prefix = `$PREFIX$`
      const url = typeof parts === 'string' ? parts : '/' + parts.join('/')
      return { url: prefix + url + `?paragraphsBlokkli=true` }
    }

    const formFrameBuilder: DrupalAdapter['formFrameBuilder'] = (e) => {
      const entityType = ctx.value.entityType.toLowerCase()
      if (e.id === 'block:add') {
        return buildFormUrl([
          'paragraphs_blokkli',
          entityType,
          ctx.value.entityUuid,
          'add',
          e.data.bundle,
          e.data.host.type,
          e.data.host.uuid,
          e.data.host.fieldName,
          e.data.afterUuid,
        ])
      } else if (e.id === 'block:edit' || e.id === 'block:translate') {
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/edit/${e.data.uuid}`,
        )
      } else if (e.id === 'entity:edit' || e.id === 'entity:translate') {
        const langcode = 'langcode' in e ? e.langcode : ctx.value.language
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/edit_entity/${langcode}`,
        )
      } else if (e.id === 'batchTranslate') {
        buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/translate-paragraphs`,
        )
      }
    }

    const getFieldConfig: DrupalAdapter['getFieldConfig'] = () =>
      useGraphqlQuery('pbGetFieldConfig').then(
        (v) => v.data.pbGetFieldConfig || [],
      )

    const getEditableFieldConfig: DrupalAdapter['getEditableFieldConfig'] =
      () =>
        useGraphqlQuery('pbGetEditableFieldConfig', {
          entityType: providedContext.value.entityType,
          entityBundle: providedContext.value.entityBundle,
        }).then((v) => v.data.pbGetEditableFieldConfig || [])

    const getDroppableFieldConfig: DrupalAdapter['getDroppableFieldConfig'] =
      () =>
        useGraphqlQuery('pbGetDroppableFieldConfig', {
          entityType: providedContext.value.entityType,
          entityBundle: providedContext.value.entityBundle,
        }).then((v) => v.data.pbGetDroppableFieldConfig || [])

    const updateFieldValue: DrupalAdapter['updateFieldValue'] = (e) =>
      useGraphqlMutation('pbUpdateFieldValue', {
        ...ctx.value,
        langcode: ctx.value.language,
        uuid: e.uuid,
        fieldName: e.fieldName,
        value: e.fieldValue,
      }).then(mapMutation)

    const buildEditableFrameUrl: DrupalAdapter['buildEditableFrameUrl'] = (
      e,
    ) => {
      const url =
        '/' +
        [
          'paragraphs_blokkli',
          ctx.value.entityType,
          ctx.value.entityUuid,
          'edit',
          'rich_text',
          e.fieldName,
          e.uuid,
        ]
          .filter(falsy)
          .join('/')
      return buildFormUrl(url).url
    }

    const fragmentsAddBlock: DrupalAdapter['fragmentsAddBlock'] = (e) =>
      useGraphqlMutation('pbAddFragmentParagraph', {
        ...ctx.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.preceedingUuid,
        name: e.name,
      }).then(mapMutation)

    const mediaLibraryReplaceMedia: DrupalAdapter['mediaLibraryReplaceMedia'] =
      (e) =>
        useGraphqlMutation('pbReplaceMedia', {
          ...ctx.value,
          langcode: providedContext.value.language,
          uuid: e.host.uuid,
          fieldName: e.host.fieldName,
          mediaId: e.mediaId,
        }).then(mapMutation)

    const mediaLibraryReplaceEntityMedia: DrupalAdapter['mediaLibraryReplaceEntityMedia'] =
      (e) =>
        useGraphqlMutation('pbReplaceHostEntityMedia', {
          ...ctx.value,
          langcode: providedContext.value.language,
          fieldName: e.host.fieldName,
          mediaId: e.mediaId,
        }).then(mapMutation)

    const updateEntityFieldValue: DrupalAdapter['updateEntityFieldValue'] = (
      e,
    ) =>
      useGraphqlMutation('pbUpdateHostEntityFieldValue', {
        ...ctx.value,
        langcode: providedContext.value.language,
        fieldName: e.fieldName,
        value: e.fieldValue,
      }).then(mapMutation)

    return {
      buildEditableFrameUrl,
      getTransformPlugins,
      applyTransformPlugin,
      getImportItems,
      getConversions,
      getAllBundles,
      loadState,
      getDisabledFeatures,
      takeOwnership,
      setHistoryIndex,
      publish,
      importFromExisting,
      revertAllChanges,
      makeBlockReusable,
      duplicateBlocks,
      convertBlocks,
      addLibraryItem,
      moveMultipleBlocks,
      moveBlock,
      addNewBlock,
      updateOptions,
      mapState,
      loadComments,
      addComment,
      resolveComment,
      getLibraryItems,
      detachReusableBlock,
      getLastChanged,
      getPreviewGrantUrl,
      formFrameBuilder,
      deleteBlocks,
      getFieldConfig,
      pasteExistingBlocks,
      updateFieldValue,
      getEditableFieldConfig,
      fragmentsAddBlock,
      mediaLibraryReplaceMedia,
      mediaLibraryReplaceEntityMedia,
      updateEntityFieldValue,
      getDroppableFieldConfig,
    }
  },
)
