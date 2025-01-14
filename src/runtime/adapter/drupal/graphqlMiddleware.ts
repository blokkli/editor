// @ts-nocheck
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import { falsy } from '#blokkli/helpers'
import type { BlockBundleDefinition, TranslationState } from '#blokkli/types'
import type { BlokkliAdapter, GetMediaLibraryFunction } from '#blokkli/adapter'
import {
  useGraphqlQuery,
  useGraphqlMutation,
  computed,
  useRoute,
  useRouter,
} from '#imports'
import {
  ParagraphsBlokkliRemoteVideoProvider,
  type ParagraphsBlokkliCommentFragment,
  type ParagraphsBlokkliEditStateFragment,
} from '#graphql-operations'

type DrupalAdapter = BlokkliAdapter<ParagraphsBlokkliEditStateFragment>

export default defineBlokkliEditAdapter<ParagraphsBlokkliEditStateFragment>(
  async (providedContext) => {
    const ctx = computed(() => {
      return {
        entityType: providedContext.value.entityType.toUpperCase() as any,
        entityBundle: providedContext.value.entityBundle,
        entityUuid: providedContext.value.entityUuid,
        langcode: providedContext.value.language,
      }
    })

    const config = await useGraphqlQuery('pbConfig', {
      entityType: providedContext.value.entityType,
      entityBundle: providedContext.value.entityBundle,
    }).then((v) => {
      return {
        clipboard: v.data.clipboards || [],
        availableFeatures: v.data.features,
        allTypes: (v.data.allTypes.items || []).filter(
          (v) => v && 'icon' in v,
        ) as BlockBundleDefinition[],
        fieldConfig: v.data.fieldConfig || [],
        editableFieldConfig: v.data.editableFieldConfig || [],
        droppableFieldConfig: v.data.droppableFieldConfig || [],
        urlPrefixes: v.data.urlPrefixes.reduce<Record<string, string>>(
          (acc, item) => {
            acc[item.langcode] = item.prefix
            return acc
          },
          {},
        ),
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

    const getAllBundles: DrupalAdapter['getAllBundles'] = () => {
      return Promise.resolve(config.allTypes)
    }

    const loadState: DrupalAdapter['loadState'] = async () => {
      const state = await useGraphqlQuery('pbEditState', {
        ...ctx.value,
      }).then((v) => v?.data.state)

      if (!state) {
        throw new Error('Failed to load state.')
      }

      return state
    }

    const loadStateAtIndex: DrupalAdapter['loadStateAtIndex'] = (
      historyIndex,
    ) =>
      useGraphqlQuery('pbEditState', {
        ...ctx.value,
        historyIndex,
      }).then((v) => v?.data.state)

    const getDisabledFeatures: DrupalAdapter['getDisabledFeatures'] = () => {
      const features = config.availableFeatures
      const disabled: string[] = []
      const mutations = features?.mutations || []
      if (!features?.comment) {
        disabled.push('Comments')
      }
      if (!features?.conversion) {
        disabled.push('Conversions')
      }
      if (!features?.library) {
        disabled.push('Library')
      }
      if (!mutations.includes('duplicate')) {
        disabled.push('Duplicate')
      }
      return Promise.resolve(disabled)
    }

    const mapMutation = (v: any) => v.data?.state?.action

    const takeOwnership: DrupalAdapter['takeOwnership'] = () =>
      useGraphqlMutation('pbTakeOwnership', ctx.value).then(mapMutation)

    const setHistoryIndex: DrupalAdapter['setHistoryIndex'] = (index) =>
      useGraphqlMutation('pbSetHistoryIndex', {
        ...ctx.value,
        index,
      }).then(mapMutation)

    const setMutationItemStatus: DrupalAdapter['setMutationItemStatus'] = (
      index,
      status,
    ) =>
      useGraphqlMutation('pbSetMutationItemStatus', {
        ...ctx.value,
        index,
        status,
      }).then(mapMutation)

    const publish: DrupalAdapter['publish'] = (options) =>
      useGraphqlMutation('pbPublish', {
        ...ctx.value,
        createNewState: !options.closeAfterPublish,
      }).then(mapMutation)

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
      const entity = state.entity

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
        availableLanguages: (
          state.translationState?.availableLanguages || []
        ).map((language) => {
          return {
            id: language.id!,
            name: language.name,
          }
        }),
        translations: (state.translationState?.translations || [])
          .map((v) => {
            if (v.id && v.url && v.editUrl) {
              return {
                id: v.id,
                url: v.url,
                editUrl: v.editUrl,
                exists: !!v.exists,
                status: !!v.status,
              }
            }
            return null
          })
          .filter(falsy),
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

    const mapComments = (comments: Array<ParagraphsBlokkliCommentFragment>) =>
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

    const getLibraryItems: DrupalAdapter['getLibraryItems'] = (data) => {
      return useGraphqlQuery('pbLibraryItems', {
        bundles: data.bundles,
        text: data.text,
        page: data.page,
      }).then((response) => {
        const items =
          response.data.result.items
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

        return {
          items,
          perPage: response.data.result?.perPage || 16,
          total: response.data.result?.total || 0,
        }
      })
    }

    const getLastChanged: DrupalAdapter['getLastChanged'] = () =>
      $fetch<{ changed: number }>(
        `/paragraphs_blokkli/${ctx.value.entityType}/${ctx.value.entityUuid}/last_changed`,
      ).then((v) => v.changed)

    const getPreviewGrantUrl: DrupalAdapter['getPreviewGrantUrl'] = () =>
      useGraphqlQuery('pbGetPreviewGrantUrl', ctx.value).then(
        (v) => v.data.getParagraphsEditState?.previewUrl,
      )

    const getTransformPlugins: DrupalAdapter['getTransformPlugins'] = () =>
      useGraphqlQuery('pbGetTransformPlugins', ctx.value)
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

    const buildFormUrl = (parts: string | string[], langcode: string) => {
      const prefix = config.urlPrefixes[langcode]
      if (prefix === null || prefix === undefined) {
        throw new Error('Failed to get URL prefix for langcode: ' + langcode)
      }
      const url = typeof parts === 'string' ? parts : '/' + parts.join('/')
      return { url: prefix + url + `?paragraphsBlokkli=true` }
    }

    const getLibraryItemEditUrl: DrupalAdapter['getLibraryItemEditUrl'] = (
      uuid,
    ) => {
      const url = buildFormUrl(
        ['blokkli', 'library-item', uuid],
        ctx.value.langcode,
      ).url

      // Directly build the URL to start blökkli for the paragraphs_library_item.
      return `${url}&blokkliEditing=${uuid}&language=${ctx.value.langcode}`
    }

    const formFrameBuilder: DrupalAdapter['formFrameBuilder'] = (e) => {
      const entityType = ctx.value.entityType.toLowerCase()
      if (e.id === 'block:add') {
        return buildFormUrl(
          [
            'paragraphs_blokkli',
            entityType,
            ctx.value.entityUuid,
            'add',
            e.data.bundle,
            e.data.host.type,
            e.data.host.uuid,
            e.data.host.fieldName,
            e.data.afterUuid,
          ],
          ctx.value.langcode,
        )
      } else if (e.id === 'block:edit') {
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/edit/${e.data.uuid}`,
          ctx.value.langcode,
        )
      } else if (e.id === 'block:translate') {
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/edit/${e.data.uuid}`,
          e.langcode,
        )
      } else if (e.id === 'entity:edit') {
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/edit_entity/${ctx.value.langcode}`,
          ctx.value.langcode,
        )
      } else if (e.id === 'entity:translate') {
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/edit_entity/${e.translation.id}`,
          e.translation.id,
        )
      } else if (e.id === 'batchTranslate') {
        return buildFormUrl(
          `/paragraphs_blokkli/${entityType}/${ctx.value.entityUuid}/translate-paragraphs`,
          ctx.value.langcode,
        )
      }
    }

    const getFieldConfig: DrupalAdapter['getFieldConfig'] = () => {
      return Promise.resolve(config.fieldConfig)
    }

    const getEditableFieldConfig: DrupalAdapter['getEditableFieldConfig'] =
      () => {
        return Promise.resolve(config.editableFieldConfig)
      }

    // @TODO: Required property.
    const getDroppableFieldConfig: DrupalAdapter['getDroppableFieldConfig'] =
      () => {
        return Promise.resolve(config.droppableFieldConfig)
      }

    const updateFieldValue: DrupalAdapter['updateFieldValue'] = (e) =>
      useGraphqlMutation('pbUpdateFieldValue', {
        ...ctx.value,
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
      return buildFormUrl(url, ctx.value.langcode).url
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
          uuid: e.host.uuid,
          fieldName: e.host.fieldName,
          mediaId: e.mediaId,
        }).then(mapMutation)

    const mediaLibraryReplaceEntityMedia: DrupalAdapter['mediaLibraryReplaceEntityMedia'] =
      (e) =>
        useGraphqlMutation('pbReplaceHostEntityMedia', {
          ...ctx.value,
          fieldName: e.host.fieldName,
          mediaId: e.mediaId,
        }).then(mapMutation)

    const updateEntityFieldValue: DrupalAdapter['updateEntityFieldValue'] = (
      e,
    ) =>
      useGraphqlMutation('pbUpdateHostEntityFieldValue', {
        ...ctx.value,
        fieldName: e.fieldName,
        value: e.fieldValue,
      }).then(mapMutation)

    const mediaLibraryGetResults: GetMediaLibraryFunction<any> = (e) => {
      return useGraphqlQuery('pbMediaLibraryGetResults', {
        text: e.filters.text,
        bundle: e.filters.bundle,
        page: e.page,
      }).then((data) => {
        return {
          filters: (data.data.pbMediaLibraryGetResults?.filters || []).reduce<
            Record<any, any>
          >((acc, filter) => {
            if (
              filter.__typename === 'ParagraphsBlokkliMediaLibraryFilterText'
            ) {
              acc[filter.id] = {
                type: 'text',
                placeholder: filter.placeholder,
                label: filter.label,
              }
            } else if (
              filter.__typename === 'ParagraphsBlokkliMediaLibraryFilterSelect'
            ) {
              acc[filter.id] = {
                type: 'select',
                label: filter.label,
                default: filter.default,
                options: filter.options,
              }
            }
            return acc
          }, {} as any),
          items: data.data.pbMediaLibraryGetResults?.items || [],
          total: data.data.pbMediaLibraryGetResults?.total || 0,
          perPage: data.data.pbMediaLibraryGetResults?.perPage || 50,
        }
      })
    }

    const mediaLibraryAddBlock: DrupalAdapter['mediaLibraryAddBlock'] = (e) => {
      return useGraphqlMutation('pbAddEntityReference', {
        ...ctx.value,
        targetId: e.item.mediaId,
        targetBundle: e.item.mediaBundle,
        targetType: 'media',
        paragraphBundle: e.item.itemBundle,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.preceedingUuid,
      }).then(mapMutation)
    }

    const mediaLibraryAddBlocks: DrupalAdapter['mediaLibraryAddBlocks'] = (
      e,
    ) => {
      return useGraphqlMutation('pbAddEntityReferenceMultiple', {
        ...ctx.value,
        references: e.items.map((item) => {
          return {
            targetId: item.mediaId,
            targetType: 'media',
            targetBundle: item.mediaBundle,
            paragraphBundle: item.itemBundle,
          }
        }),
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.preceedingUuid,
      }).then(mapMutation)
    }

    const getContentSearchTabs: DrupalAdapter['getContentSearchTabs'] = () => {
      return useGraphqlQuery('pbSearchTabs').then((v) => {
        return (v.data.tabs || []).reduce<Record<string, string>>(
          (acc, tab) => {
            acc[tab.id] = tab.label
            return acc
          },
          {},
        )
      })
    }

    const getContentSearchResults: DrupalAdapter['getContentSearchResults'] = (
      id,
      text,
    ) => {
      return useGraphqlQuery('pbSearch', {
        id,
        text,
      }).then((v) => v.data.paragraphsBlokkliSearch || [])
    }

    const addContentSearchItem: DrupalAdapter['addContentSearchItem'] = (e) => {
      return useGraphqlMutation('pbAddEntityReference', {
        ...ctx.value,
        targetId: e.item.id,
        targetType: e.item.entityType,
        targetBundle: e.item.entityBundle,
        paragraphBundle: e.bundle,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }).then(mapMutation)
    }

    const clipboardMapBundle: DrupalAdapter['clipboardMapBundle'] = (e) => {
      if (e.type === 'video') {
        return config.clipboard.find((v) => {
          if (
            v.__typename === 'ParagraphsBlokkliSupportedClipboardRemoteVideo'
          ) {
            const providers = v.videoProviders
            if (e.videoService === 'vimeo') {
              return providers.includes(
                ParagraphsBlokkliRemoteVideoProvider.VIMEO,
              )
            } else if (e.videoService === 'youtube') {
              return providers.includes(
                ParagraphsBlokkliRemoteVideoProvider.YOUTUBE,
              )
            }
          }

          return false
        })?.possibleParagraphBundles?.[0]
      } else if (e.type === 'plaintext') {
        return config.clipboard.find((v) => {
          return v.__typename === 'ParagraphsBlokkliSupportedClipboardRichText'
        })?.possibleParagraphBundles?.[0]
      } else if (e.type === 'image') {
        return config.clipboard.find((v) => {
          return v.__typename === 'ParagraphsBlokkliSupportedClipboardImage'
        })?.possibleParagraphBundles?.[0]
      } else if (e.type === 'file') {
        return config.clipboard.find((v) => {
          return v.__typename === 'ParagraphsBlokkliSupportedClipboardFile'
        })?.possibleParagraphBundles?.[0]
      }
    }

    const addBlockFromClipboardItem: DrupalAdapter['addBlockFromClipboardItem'] =
      (e) => {
        if (e.item.type === 'text') {
          return useGraphqlMutation('pbAddClipboardText', {
            ...ctx.value,
            text: e.item.data,
            hostType: e.host.type,
            hostUuid: e.host.uuid,
            hostFieldName: e.host.fieldName,
            afterUuid: e.afterUuid,
          }).then(mapMutation)
        } else if (e.item.type === 'image') {
          return useGraphqlMutation('pbAddImage', {
            ...ctx.value,
            data: e.item.data,
            fileName: e.item.additional || '',
            hostType: e.host.type,
            hostUuid: e.host.uuid,
            hostFieldName: e.host.fieldName,
            afterUuid: e.afterUuid,
          }).then(mapMutation)
        } else if (e.item.type === 'file') {
          return useGraphqlMutation('pbAddFile', {
            ...ctx.value,
            data: e.item.data,
            fileName: e.item.additional || '',
            hostType: e.host.type,
            hostUuid: e.host.uuid,
            hostFieldName: e.host.fieldName,
            afterUuid: e.afterUuid,
          }).then(mapMutation)
        } else if (e.item.type === 'video') {
          return useGraphqlMutation('pbAddVideoRemote', {
            ...ctx.value,
            url: e.item.data,
            hostType: e.host.type,
            hostUuid: e.host.uuid,
            hostFieldName: e.host.fieldName,
            afterUuid: e.afterUuid,
          }).then(mapMutation)
        }
      }

    const route = useRoute()
    const router = useRouter()

    const changeLanguage: DrupalAdapter['changeLanguage'] = (translation) => {
      return router.push({ path: translation.url, query: route.query })
    }

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
      setMutationItemStatus,
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
      mediaLibraryGetResults,
      mediaLibraryAddBlock,
      mediaLibraryAddBlocks,
      getContentSearchTabs,
      getContentSearchResults,
      addContentSearchItem,
      clipboardMapBundle,
      addBlockFromClipboardItem,
      changeLanguage,
      getLibraryItemEditUrl,
      loadStateAtIndex,
    }
  },
)
