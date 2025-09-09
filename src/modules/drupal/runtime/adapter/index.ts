import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import { falsy } from '#blokkli/helpers'
import { availableFeaturesAtBuild } from '#blokkli-build/features'
import { operationSources } from '#nuxt-graphql-middleware/sources'
import type {
  BlockBundleDefinition,
  HostTransformPlugin,
  PluginConfigInput,
  TransformPlugin,
  TranslationState,
} from '#blokkli/types'
import type { BlokkliAdapter } from '#blokkli/adapter'
import {
  useGraphqlQuery,
  useGraphqlMutation,
  computed,
  useRoute,
  useRouter,
} from '#imports'
import type {
  ParagraphsBlokkliCommentFragment,
  ParagraphsBlokkliConfigInputFragment,
  ParagraphsBlokkliEditStateFragment,
} from '#graphql-operations'
import { ParagraphsBlokkliRemoteVideoProvider } from '#graphql-operations'
import type { Mutation, Query } from '#nuxt-graphql-middleware/operation-types'

type DrupalAdapter = BlokkliAdapter<ParagraphsBlokkliEditStateFragment>

function mapPluginConfigInputs(
  inputs: ParagraphsBlokkliConfigInputFragment[],
): PluginConfigInput[] {
  return inputs
    .map<PluginConfigInput | null>((input) => {
      if (input.__typename === 'ParagraphsBlokkliConfigInputText') {
        return {
          type: 'text',
          name: input.name,
          label: input.label,
          description: input.description,
          required: input.required,
          defaultValue: input.defaultValueText,
          minLength: input.minLength,
          maxLength: input.maxLength,
          placeholder: input.placeholder,
          pattern: input.pattern,
          multiline: input.multiline,
          rows: input.rows,
        }
      } else if (input.__typename === 'ParagraphsBlokkliConfigInputCheckbox') {
        return {
          type: 'checkbox',
          name: input.name,
          label: input.label,
          description: input.description,
          required: input.required,
          defaultValue: input.defaultValueCheckbox ?? false,
          checkboxLabel: input.checkboxLabel,
        }
      } else if (input.__typename === 'ParagraphsBlokkliConfigInputOptions') {
        return {
          type: 'options',
          name: input.name,
          label: input.label,
          description: input.description,
          required: input.required,
          defaultValue: input.defaultValueOptions ?? '',
          variant: input.variant,
          options: input.options,
        }
      }

      return null
    })
    .filter(falsy)
}

export default defineBlokkliEditAdapter<ParagraphsBlokkliEditStateFragment>(
  async (providedContext) => {
    if (import.meta.dev) {
      console.log('initialise Drupal blökkli adapter')
    }
    const availableFeatureIds = new Set(availableFeaturesAtBuild)
    const availableGraphqlOperations = new Set(Object.keys(operationSources))

    function hasQuery(name: keyof Query): boolean {
      return availableGraphqlOperations.has('query_' + name)
    }

    function hasMutation(name: keyof Mutation): boolean {
      return availableGraphqlOperations.has('mutation_' + name)
    }

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
            if (item?.langcode) {
              acc[item.langcode] = item.prefix
            }
            return acc
          },
          {},
        ),
      }
    })

    const loadState: DrupalAdapter['loadState'] = async () => {
      const state = await useGraphqlQuery('pbEditState', {
        ...ctx.value,
      }).then((v) => v?.data.state)

      if (!state) {
        throw new Error('Failed to load state.')
      }

      return state
    }

    const getAllBundles: DrupalAdapter['getAllBundles'] = () => {
      return Promise.resolve(config.allTypes)
    }

    const getFieldConfig: DrupalAdapter['getFieldConfig'] = () => {
      return Promise.resolve(config.fieldConfig)
    }

    const mapState: DrupalAdapter['mapState'] = (state) => {
      const currentIndex =
        state?.currentIndex === null || state?.currentIndex === undefined
          ? -1
          : state.currentIndex
      const mutations = (state?.mutations || []).filter(falsy)
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

      const mutatedHostOptions = state.mutatedState?.hostOptions || {}

      return {
        currentIndex,
        mutations,
        currentUserIsOwner,
        ownerName,
        mutatedState: {
          fields,
          violations,
          mutatedOptions,
          // PHP and its arrays...
          mutatedHostOptions: Array.isArray(mutatedHostOptions)
            ? {}
            : mutatedHostOptions,
        },
        entity,
        mutatedEntity: state.mutatedEntity,
        translationState,
      }
    }

    const addNewBlock: DrupalAdapter['addNewBlock'] = (e) =>
      useGraphqlMutation('pbAddParagraph', {
        ...ctx.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.bundle,
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

    const moveMultipleBlocks: DrupalAdapter['moveMultipleBlocks'] = (e) =>
      useGraphqlMutation('pbMoveMultipleItems', {
        ...ctx.value,
        uuids: e.uuids,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }).then(mapMutation)

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
        disabled.push('comments')
      }
      if (!features?.conversion) {
        disabled.push('conversions')
      }
      if (!features?.library) {
        disabled.push('library')
      }
      if (!mutations.includes('duplicate')) {
        disabled.push('duplicate')
      }
      return Promise.resolve(disabled)
    }

    const mapMutation = (v: any) => v.data?.state?.action
    const route = useRoute()
    const router = useRouter()

    const changeLanguage: DrupalAdapter['changeLanguage'] = (translation) => {
      return router.push({ path: translation.url, query: route.query })
    }

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

    const getEditableFieldConfig: DrupalAdapter['getEditableFieldConfig'] =
      () => {
        return Promise.resolve(config.editableFieldConfig)
      }

    // @TODO: Required property.
    const getDroppableFieldConfig: DrupalAdapter['getDroppableFieldConfig'] =
      () => {
        return Promise.resolve(config.droppableFieldConfig)
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

    const getLastChanged: DrupalAdapter['getLastChanged'] = () =>
      $fetch<{ changed: number }>(
        `/paragraphs_blokkli/${ctx.value.entityType}/${ctx.value.entityUuid}/last_changed`,
      ).then((v) => v.changed)

    const adapter: BlokkliAdapter<any> = {
      addNewBlock,
      buildEditableFrameUrl,
      changeLanguage,
      formFrameBuilder,
      getAllBundles,
      getDisabledFeatures,
      getDroppableFieldConfig,
      getEditableFieldConfig,
      getFieldConfig,
      getLastChanged,
      loadState,
      loadStateAtIndex,
      mapState,
      moveBlock,
      moveMultipleBlocks,
    }

    if (hasQuery('pbPublishOptions')) {
      adapter.getPublishOptions = () =>
        useGraphqlQuery('pbPublishOptions', ctx.value).then((v) => {
          const options = v.data.state?.publishOptions
          if (!options) {
            throw new Error('Failed to load publish options.')
          }

          return options
        })
    }

    if (hasQuery('pbGetImportSourceEntities')) {
      adapter.getImportItems = (searchText?: string) =>
        useGraphqlQuery('pbGetImportSourceEntities', {
          entityType: (ctx.value.entityType as string).toLowerCase(),
          entityUuid: ctx.value.entityUuid,
          searchText,
        }).then((data) => {
          return {
            total: data?.data.pbGetImportSourceEntities?.total || 0,
            items: (data?.data.pbGetImportSourceEntities?.items || [])
              .map((item) => {
                if (item?.uuid) {
                  return {
                    uuid: item.uuid,
                    label: item.label || item.uuid,
                  }
                }
              })
              .filter(falsy),
          }
        })
    }

    if (hasQuery('pbConversions')) {
      adapter.getConversions = () =>
        useGraphqlQuery('pbConversions').then(
          (v) => v?.data.paragraphsBlokkliConversions || [],
        )
    }

    if (hasMutation('pbTakeOwnership')) {
      adapter.takeOwnership = () =>
        useGraphqlMutation('pbTakeOwnership', ctx.value).then(mapMutation)
    }

    if (hasMutation('pbUpdateHostOptions')) {
      adapter.updateHostOptions = (items) =>
        useGraphqlMutation('pbUpdateHostOptions', {
          ...ctx.value,
          items,
        }).then(mapMutation)
    }

    if (hasMutation('pbSetHistoryIndex')) {
      adapter.setHistoryIndex = (index) =>
        useGraphqlMutation('pbSetHistoryIndex', {
          ...ctx.value,
          index,
        }).then(mapMutation)
    }

    if (hasMutation('pbSetMutationItemStatus')) {
      adapter.setMutationItemStatus = (index, status) =>
        useGraphqlMutation('pbSetMutationItemStatus', {
          ...ctx.value,
          index,
          status,
        }).then(mapMutation)
    }

    if (hasMutation('pbPublish')) {
      adapter.publish = (options) =>
        useGraphqlMutation('pbPublish', {
          entityType: options.hostEntityType.toUpperCase() as any,
          entityUuid: options.hostEntityUuid,
          createNewState: !options.closeAfterPublish,
          publishIfUnpublished: options.publishIfUnpublished,
          revisionLogMessage: options.revisionLogMessage,
        }).then(mapMutation)
    }

    if (hasMutation('pbCopyFromExisting')) {
      adapter.importFromExisting = (e) =>
        useGraphqlMutation('pbCopyFromExisting', {
          ...ctx.value,
          sourceUuid: e.sourceUuid,
          fields: e.sourceFields,
        }).then(mapMutation)
    }

    if (hasMutation('pbRevertAllChanges')) {
      adapter.revertAllChanges = () =>
        useGraphqlMutation('pbRevertAllChanges', ctx.value).then(mapMutation)
    }

    if (hasMutation('pbMakeParagraphReusable')) {
      adapter.makeBlockReusable = (e) =>
        useGraphqlMutation('pbMakeParagraphReusable', {
          ...ctx.value,
          ...e,
        }).then(mapMutation)
    }

    if (hasMutation('pbDuplicateParagraph')) {
      adapter.duplicateBlocks = (uuids) => {
        if (uuids.length === 1) {
          return useGraphqlMutation('pbDuplicateParagraph', {
            ...ctx.value,
            uuid: uuids[0]!,
          }).then(mapMutation)
        }
        return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
          ...ctx.value,
          uuids,
        }).then(mapMutation)
      }
    }

    if (hasMutation('pbDuplicateMultipleParagraphs')) {
      adapter.pasteExistingBlocks = (e) => {
        return useGraphqlMutation('pbDuplicateMultipleParagraphs', {
          ...ctx.value,
          uuids: e.uuids,
          afterUuid: e.preceedingUuid,
        }).then(mapMutation)
      }
    }

    if (hasMutation('pbDetachReusableParagraph')) {
      adapter.detachReusableBlock = (e) => {
        return useGraphqlMutation('pbDetachReusableParagraph', {
          ...ctx.value,
          uuids: e.uuids,
        }).then(mapMutation)
      }
    }

    if (hasMutation('pbConvertParagraph') && hasMutation('pbConvertMultiple')) {
      adapter.convertBlocks = (uuids, targetBundle) => {
        if (uuids.length === 1) {
          return useGraphqlMutation('pbConvertParagraph', {
            ...ctx.value,
            uuid: uuids[0]!,
            targetBundle,
          }).then(mapMutation)
        }
        return useGraphqlMutation('pbConvertMultiple', {
          ...ctx.value,
          uuids,
          targetBundle,
        }).then(mapMutation)
      }
    }

    if (hasMutation('pbDeleteMultipleParagraphs')) {
      adapter.deleteBlocks = (uuids) =>
        useGraphqlMutation('pbDeleteMultipleParagraphs', {
          ...ctx.value,
          uuids,
        }).then(mapMutation)
    }

    if (hasMutation('pbAddReusableParagraph')) {
      adapter.addLibraryItem = (e) =>
        useGraphqlMutation('pbAddReusableParagraph', {
          ...ctx.value,
          libraryItemUuid: e.libraryItemUuid,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        }).then(mapMutation)
    }

    if (
      hasMutation('pbUpdateParagraphOption') &&
      hasMutation('pbBulkUpdateParagraphBehaviorSettings')
    ) {
      adapter.updateOptions = (options) => {
        if (options.length === 1) {
          return useGraphqlMutation('pbUpdateParagraphOption', {
            ...ctx.value,
            uuid: options[0]!.uuid,
            key: options[0]!.key,
            value: options[0]!.value,
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
    }

    const mapComments = (
      comments: Array<ParagraphsBlokkliCommentFragment | null>,
    ) =>
      comments
        .map((item) => {
          if (item && 'uuid' in item) {
            return {
              uuid: item.uuid,
              blockUuids: (item.blockUuids || []).filter(falsy),
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

    if (hasQuery('pbComments')) {
      adapter.loadComments = () =>
        useGraphqlQuery('pbComments', ctx.value).then((v) =>
          mapComments(v.data.state?.comments || []),
        )
    }

    if (hasMutation('pbAddComment')) {
      adapter.addComment = (blockUuids, body) =>
        useGraphqlMutation('pbAddComment', {
          ...ctx.value,
          blockUuids,
          body,
        }).then((v) => mapComments(v.data.state?.action || []))
    }

    if (hasMutation('pbResolveComment')) {
      adapter.resolveComment = (uuid) =>
        useGraphqlMutation('pbResolveComment', {
          ...ctx.value,
          uuid,
        }).then((v) => mapComments(v.data.state?.action || []))
    }

    if (hasQuery('pbLibraryItems')) {
      adapter.getLibraryItems = (data) => {
        return useGraphqlQuery('pbLibraryItems', {
          bundles: data.bundles,
          text: data.text,
          page: data.page,
        }).then((response) => {
          const items =
            response.data.result?.items
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
    }

    if (hasQuery('pbGetPreviewGrantUrl')) {
      adapter.getPreviewGrantUrl = () =>
        useGraphqlQuery('pbGetPreviewGrantUrl', ctx.value).then(
          (v) => v.data.getParagraphsEditState?.previewUrl,
        )
    }

    if (hasQuery('pbGetTransformPlugins')) {
      adapter.getTransformPlugins = () =>
        useGraphqlQuery('pbGetTransformPlugins', ctx.value)
          .then((v) => v.data.paragraphsBlokkliGetTransformPlugins || [])
          .then((plugins) =>
            plugins.map<TransformPlugin>((plugin) => {
              return {
                id: plugin.id,
                label: plugin.label,
                bundles: plugin.bundles,
                targetBundles: plugin.targetBundles,
                min: plugin.min,
                max: plugin.max,
                configInputs: mapPluginConfigInputs(plugin.configInputs),
              }
            }),
          )
    }

    if (hasQuery('pbGetHostTransformPlugins')) {
      adapter.getHostTransformPlugins = () =>
        useGraphqlQuery('pbGetHostTransformPlugins', ctx.value)
          .then((v) => v.data.paragraphsBlokkliGetHostTransformPlugins || [])
          .then((plugins) =>
            plugins.map<HostTransformPlugin>((plugin) => {
              return {
                id: plugin.id,
                label: plugin.label,
                configInputs: mapPluginConfigInputs(plugin.configInputs),
              }
            }),
          )
    }

    if (hasMutation('pbApplyTransformPlugin')) {
      adapter.applyTransformPlugin = (e) =>
        useGraphqlMutation('pbApplyTransformPlugin', {
          ...ctx.value,
          ...e,
        }).then(mapMutation)
    }

    if (hasMutation('pbApplyHostTransformPlugin')) {
      adapter.applyHostTransformPlugin = (e) =>
        useGraphqlMutation('pbApplyHostTransformPlugin', {
          ...ctx.value,
          ...e,
        }).then(mapMutation)
    }

    const buildFormUrl = (parts: string | string[], langcode: string) => {
      const prefix = config.urlPrefixes[langcode]
      if (prefix === null || prefix === undefined) {
        throw new Error('Failed to get URL prefix for langcode: ' + langcode)
      }
      const url = typeof parts === 'string' ? parts : '/' + parts.join('/')
      return { url: prefix + url + `?paragraphsBlokkli=true` }
    }

    if (availableFeatureIds.has('library')) {
      adapter.getLibraryItemEditUrl = (uuid) => {
        const url = buildFormUrl(
          ['blokkli', 'library-item', uuid],
          ctx.value.langcode,
        ).url

        // Directly build the URL to start blökkli for the paragraphs_library_item.
        return `${url}&blokkliEditing=${uuid}&language=${ctx.value.langcode}`
      }
    }

    if (hasMutation('pbUpdateFieldValue')) {
      adapter.updateFieldValue = (e) =>
        useGraphqlMutation('pbUpdateFieldValue', {
          ...ctx.value,
          uuid: e.uuid,
          fieldName: e.fieldName,
          value: e.fieldValue,
        }).then(mapMutation)
    }

    if (hasMutation('pbAddFragmentParagraph')) {
      adapter.fragmentsAddBlock = (e) =>
        useGraphqlMutation('pbAddFragmentParagraph', {
          ...ctx.value,
          hostType: e.host.type,
          hostFieldName: e.host.fieldName,
          hostUuid: e.host.uuid,
          afterUuid: e.preceedingUuid,
          name: e.name,
        }).then(mapMutation)
    }

    if (hasMutation('pbReplaceMedia')) {
      adapter.mediaLibraryReplaceMedia = (e) =>
        useGraphqlMutation('pbReplaceMedia', {
          ...ctx.value,
          uuid: e.host.uuid,
          fieldName: e.host.fieldName,
          mediaId: e.mediaId,
        }).then(mapMutation)
    }

    if (hasMutation('pbReplaceHostEntityMedia')) {
      adapter.mediaLibraryReplaceEntityMedia = (e) =>
        useGraphqlMutation('pbReplaceHostEntityMedia', {
          ...ctx.value,
          fieldName: e.host.fieldName,
          mediaId: e.mediaId,
        }).then(mapMutation)
    }

    if (hasMutation('pbUpdateHostEntityFieldValue')) {
      adapter.updateEntityFieldValue = (e) =>
        useGraphqlMutation('pbUpdateHostEntityFieldValue', {
          ...ctx.value,
          fieldName: e.fieldName,
          value: e.fieldValue,
        }).then(mapMutation)
    }

    if (hasQuery('pbMediaLibraryGetResults')) {
      adapter.mediaLibraryGetResults = (e) => {
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
                filter?.__typename === 'ParagraphsBlokkliMediaLibraryFilterText'
              ) {
                acc[filter.id] = {
                  type: 'text',
                  placeholder: filter.placeholder,
                  label: filter.label,
                }
              } else if (
                filter?.__typename ===
                'ParagraphsBlokkliMediaLibraryFilterSelect'
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
            items: (data.data.pbMediaLibraryGetResults?.items || []).filter(
              falsy,
            ),
            total: data.data.pbMediaLibraryGetResults?.total || 0,
            perPage: data.data.pbMediaLibraryGetResults?.perPage || 50,
          }
        })
      }
    }

    if (hasMutation('pbAddEntityReference')) {
      adapter.mediaLibraryAddBlock = (e) => {
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
    }

    if (hasMutation('pbAddEntityReferenceMultiple')) {
      adapter.mediaLibraryAddBlocks = (e) => {
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
    }

    if (hasQuery('pbSearchTabs')) {
      adapter.getContentSearchTabs = () => {
        return useGraphqlQuery('pbSearchTabs').then((v) => {
          return (v.data.tabs || []).reduce<Record<string, string>>(
            (acc, tab) => {
              if (tab?.id) {
                acc[tab.id] = tab.label
              }
              return acc
            },
            {},
          )
        })
      }
    }

    if (hasQuery('pbSearch')) {
      adapter.getContentSearchResults = (id, text) => {
        return useGraphqlQuery('pbSearch', {
          id,
          text,
        }).then((v) => (v.data.paragraphsBlokkliSearch || []).filter(falsy))
      }
    }

    if (hasMutation('pbAddEntityReference')) {
      adapter.addContentSearchItem = (e) => {
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
    }

    if (availableFeatureIds.has('clipboard')) {
      adapter.clipboardMapBundle = (e) => {
        if (e.type === 'video') {
          return config.clipboard.find((v) => {
            if (
              v?.__typename === 'ParagraphsBlokkliSupportedClipboardRemoteVideo'
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
            return (
              v?.__typename === 'ParagraphsBlokkliSupportedClipboardRichText'
            )
          })?.possibleParagraphBundles?.[0]
        } else if (e.type === 'image') {
          return config.clipboard.find((v) => {
            return v?.__typename === 'ParagraphsBlokkliSupportedClipboardImage'
          })?.possibleParagraphBundles?.[0]
        } else if (e.type === 'file') {
          return config.clipboard.find((v) => {
            return v?.__typename === 'ParagraphsBlokkliSupportedClipboardFile'
          })?.possibleParagraphBundles?.[0]
        }
      }
    }

    adapter.addBlockFromClipboardItem = (e) => {
      if (e.item.type === 'text' && hasMutation('pbAddClipboardText')) {
        return useGraphqlMutation('pbAddClipboardText', {
          ...ctx.value,
          text: e.item.data,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        }).then(mapMutation)
      } else if (e.item.type === 'image' && hasMutation('pbAddImage')) {
        return useGraphqlMutation('pbAddImage', {
          ...ctx.value,
          data: e.item.data,
          fileName: e.item.additional || '',
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        }).then(mapMutation)
      } else if (e.item.type === 'file' && hasMutation('pbAddFile')) {
        return useGraphqlMutation('pbAddFile', {
          ...ctx.value,
          data: e.item.data,
          fileName: e.item.additional || '',
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        }).then(mapMutation)
      } else if (e.item.type === 'video' && hasMutation('pbAddVideoRemote')) {
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

    if (hasQuery('pbSearchEditStates')) {
      adapter.getEditStates = (page) => {
        return useGraphqlQuery('pbSearchEditStates', { page }).then((data) => {
          return {
            items: (data.data.pbSearchEditStates?.items || [])
              .map((v) => {
                if (
                  v &&
                  v.uuid &&
                  v.hostEntityType &&
                  v.hostEntityUuid &&
                  v.label
                ) {
                  return {
                    id: v.uuid,
                    hostEntityType: v.hostEntityType,
                    hostEntityUuid: v.hostEntityUuid,
                    label: v.label,
                    ...v,
                  }
                }
                return null
              })
              .filter(falsy),
            total: data.data.pbSearchEditStates?.total || 0,
            perPage: data.data.pbSearchEditStates?.perPage || 0,
          }
        })
      }
    }

    return adapter
  },
)
