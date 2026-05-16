import {
  defineBlokkliEditAdapter,
  type BlokkliAdapterFactory,
  type FullBlokkliAdapter,
  type MutationResponseLike,
} from '#blokkli/editor/adapter'
import { falsy } from '#blokkli/helpers'
import { availableFeaturesAtBuild } from '#blokkli-build/features'
import { templateEditRouteName } from '#blokkli-build/drupal-config'
import { operationSources } from '#nuxt-graphql-middleware/sources'
import {
  useGraphqlQuery,
  useGraphqlMutation,
  computed,
  useRoute,
  useRouter,
} from '#imports'
import type {
  ParagraphsBlokkliBulkUpdateFieldValuesInput,
  ParagraphsBlokkliAddMultipleItemInput,
  ParagraphsBlokkliCommentFragment,
  ParagraphsBlokkliConfigInputFragment,
  ParagraphsBlokkliEditStateFragment,
  ParagraphsBlokkliMutationItemFragment,
  ParagraphsBlokkliMutationResultFragment,
  ParagraphsBlokkliPublishOptionsFragment,
  ParagraphsBlokkliCurrentUserFragment,
  ParagraphsBlokkliUserConfigInput,
  PbAgentConversationQuery,
} from '#graphql-operations'
import { ParagraphsBlokkliRemoteVideoProvider } from '#graphql-operations'
import type { Mutation, Query } from '#nuxt-graphql-middleware/operation-types'
import type {
  HostTransformPlugin,
  TransformPlugin,
} from '#blokkli/editor/features/transform/types'
import type {
  GetEditStatesItem,
  PublishOptions,
} from '#blokkli/editor/features/publish/types'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'
import type { TranslationState } from '#blokkli/editor/types/state'
import type { BlockBundleDefinition } from '#blokkli/editor/types/definitions'
import type { TemplateItem } from '#blokkli/editor/features/templates/types'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import type { EditPermission } from '#blokkli/types/provider'
import type { UserPermissions } from '#blokkli/editor/types/permissions'
import type { ContentSearchTab } from '#blokkli/editor/features/search/types'
import type { CommentItem } from '#blokkli/editor/features/comments/types'
import type { BlockTransferImportSummary } from '#blokkli/editor/features/block-transfer/types'

type DrupalAdapter = FullBlokkliAdapter<ParagraphsBlokkliEditStateFragment>

function mapPublishOptions(
  publishOptions: ParagraphsBlokkliPublishOptionsFragment,
): PublishOptions {
  return {
    canPublish: !!publishOptions.canPublish,
    isRevisionable: !!publishOptions.isRevisionable,
    hasRevisionLogMessage: !!publishOptions.hasRevisionLogMessage,
    lastChanged: publishOptions.lastChanged ?? null,
    canSchedule: !!publishOptions.canSchedule,
    publishOn: publishOptions.publishOn ?? null,
    revisionLogMessage: publishOptions.revisionLogMessage ?? null,
  }
}

/**
 * Maps each UserPermission to its corresponding GraphQL fragment field.
 * Adding a new permission without a mapping here will cause a type error.
 */
const PERMISSION_FIELDS: Record<
  UserPermissions,
  keyof ParagraphsBlokkliCurrentUserFragment
> = {
  use_blokkli: 'use_blokkli',
  take_ownership: 'take_ownership',
  manage_default_templates: 'manage_default_templates',
  create_library_item: 'create_library_item',
  edit_library_item: 'edit_library_item',
  create_comments: 'create_comments',
  view_comments: 'view_comments',
  use_agent: 'use_agent',
  manage_agent_conversations: 'manage_agent_conversations',
  list_users: 'list_users',
  transfer_blocks: 'transfer_blocks',
}

function mapUserPermissions(
  user: ParagraphsBlokkliCurrentUserFragment,
): UserPermissions[] {
  return (
    Object.entries(PERMISSION_FIELDS) as [
      UserPermissions,
      keyof ParagraphsBlokkliCurrentUserFragment,
    ][]
  )
    .filter(([, field]) => user[field] === true)
    .map(([permission]) => permission)
}

function valueToFilterString(v: unknown): string {
  if (typeof v === 'string') {
    return v
  } else if (typeof v === 'number') {
    return v.toString()
  } else if (typeof v === 'boolean') {
    return v ? '1' : '0'
  }

  return ''
}

function configObjectToUserConfigInput(
  values?: Record<string, any>,
): ParagraphsBlokkliUserConfigInput[] {
  if (!values) {
    return []
  }

  return Object.entries(values).map(([name, value]) => {
    return {
      name,
      value: valueToFilterString(value),
    }
  })
}

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
      } else if (input.__typename === 'ParagraphsBlokkliConfigInputSeed') {
        return {
          type: 'seed',
          name: input.name,
          label: input.label,
          description: input.description,
          required: input.required,
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
        currentUser: v.data.currentUser,
        availableFeatures: v.data.features,
        allTypes: (v.data.allTypes.items || [])
          .map<BlockBundleDefinition | null>((v) => {
            if (v && 'id' in v && v.id) {
              return {
                id: v.id,
                label: v.label ?? '',
                description: v.description ?? '',
                allowReusable: !!v.allowReusable,
                isTranslatable: !!v.isTranslatable,
                hasPublishOn: !!v.hasPublishOn,
                hasUnpublishOn: !!v.hasUnpublishOn,
                permissions: v.permissions ?? [],
              }
            }

            return null
          })
          .filter(falsy),
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
        entityTypeConfig: v.data.entityTypeConfig,
      }
    })

    const entityTypeConfigMap = new Map()

    config.entityTypeConfig.forEach((entityType) => {
      entityTypeConfigMap.set(entityType.id, entityType.label)
      entityType.bundles.forEach((bundle) => {
        entityTypeConfigMap.set(`${entityType.id}:${bundle.id}`, bundle.label)
      })
    })

    const entityConfig = await useGraphqlQuery('pbEntityConfig', {
      entityType: providedContext.value.entityType,
      entityUuid: providedContext.value.entityUuid,
    }).then((v) => {
      return {
        linkPath: v.data.config?.linkPath ?? '',
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

      if (!state.publishOptions) {
        throw new Error('Missing publish options.')
      }
      const publishOptions = mapPublishOptions(state.publishOptions)

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
        ownerId: state.user?.id,
        mutatedState: {
          fields,
          violations,
          mutatedOptions,
          // PHP and its arrays...
          mutatedHostOptions: Array.isArray(mutatedHostOptions)
            ? {}
            : mutatedHostOptions,
        },
        publishOptions,
        entity,
        mutatedEntity: state.mutatedEntity,
        translationState,
        textFieldValues: (state.textFieldValues || []).map((v) => ({
          uuid: v.uuid,
          fieldName: v.fieldName,
          value: v.value,
          fieldType: v.fieldType as 'plain' | 'markup',
          entityType: v.entityType,
          entityBundle: v.entityBundle,
        })),
        droppableFieldValues: (state.droppableFieldValues || []).map((v) => ({
          uuid: v.uuid,
          fieldName: v.fieldName,
          ids: v.ids,
          entityType: v.entityType,
          entityBundle: v.entityBundle,
        })),
        ignoredAnalyzeIdentifiers:
          state.stateSettings?.ignoredAnalyzeIdentifiers || [],
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
        uuid: e.item.block.uuid,
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

    const mapMutation = (
      v: GraphqlResponse<{
        state?: { action?: ParagraphsBlokkliMutationResultFragment }
      }>,
    ): MutationResponseLike<any> => {
      const action = v.data?.state?.action
      return {
        success: !!action?.success,
        state: action?.state,
        errors: (action?.errors ?? []).filter(falsy),
      }
    }

    type ImportSummaryFragment = NonNullable<
      NonNullable<
        ParagraphsBlokkliMutationItemFragment['plugin']
      >['importSummary']
    >

    const mapImportSummary = (
      summary: ImportSummaryFragment,
    ): BlockTransferImportSummary => {
      return {
        paragraphsImported: summary.paragraphsImported,
        referencesResolvedByUuid: summary.referencesResolvedByUuid,
        skippedBundles: summary.skippedBundles.map((s) => ({
          bundle: s.bundle,
          count: s.count,
        })),
        droppedFields: summary.droppedFields.map((d) => ({
          bundle: d.bundle,
          fieldName: d.fieldName,
        })),
        referencesResolvedByLabel: summary.referencesResolvedByLabel.map(
          (r) => ({
            entityType: r.entityType,
            label: r.label,
            targetId: r.targetId,
          }),
        ),
        referencesUnresolved: summary.referencesUnresolved.map((r) => ({
          entityType: r.entityType,
          uuid: r.uuid ?? null,
          label: r.label ?? null,
          reason: r.reason,
        })),
      }
    }
    const route = useRoute()
    const router = useRouter()

    const changeLanguage: DrupalAdapter['changeLanguage'] = (translation) => {
      // Handle case where Drupal returns absolute URL, e.g. when the domain module is enabled.
      const path = translation.url.includes('http')
        ? new URL(translation.url).pathname
        : translation.url
      return router.push({ path, query: route.query })
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

    const buildAnchorLink: DrupalAdapter['buildAnchorLink'] = (
      id: string,
      _uuid: string,
    ) => {
      return `${entityConfig.linkPath}#${id}`
    }

    const adapter: DrupalAdapter = {
      addNewBlock,
      buildEditableFrameUrl,
      getUserPermissions: function () {
        const permissions = config.currentUser
          ? mapUserPermissions(config.currentUser)
          : []
        return Promise.resolve(permissions)
      },
      getCurrentUser: () => {
        const user = config.currentUser
        if (!user || user.id == null || !user.name) {
          return Promise.reject(
            new Error(
              'paragraphsBlokkliGetUser did not return a valid id/name.',
            ),
          )
        }
        return Promise.resolve({
          id: String(user.id),
          name: user.name,
          imageUrl: user.imageUrl ?? null,
        })
      },
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
      buildAnchorLink,
      getEntityTypeInfo(id) {
        const label = entityTypeConfigMap.get(id)
        if (label) {
          return {
            id,
            label,
          }
        }

        return null
      },
      getEntityBundleInfo(entityTypeId: string, bundle: string) {
        const label = entityTypeConfigMap.get(`${entityTypeId}:${bundle}`)
        if (label) {
          return {
            id: bundle,
            label,
          }
        }

        return null
      },
    }

    if (hasQuery('pbUsers')) {
      adapter.getBlokkliUsers = () =>
        useGraphqlQuery('pbUsers').then((v) => v.data.users ?? [])
    }

    if (hasQuery('pbPublishOptions')) {
      adapter.getPublishOptions = () =>
        useGraphqlQuery('pbPublishOptions', ctx.value).then((v) => {
          const options = v.data.state?.publishOptions
          if (!options) {
            throw new Error('Failed to load publish options.')
          }

          return mapPublishOptions(options)
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

    if (hasMutation('pbClearOutdatedTranslation')) {
      adapter.markTranslationUpToDate = (uuids, langcode) =>
        useGraphqlMutation('pbClearOutdatedTranslation', {
          ...ctx.value,
          uuids,
          langcode,
        }).then(mapMutation)
    }

    if (hasMutation('pbBulkTranslateFieldValues')) {
      adapter.importTranslationsBatched = ({ items, markUpToDate }) =>
        useGraphqlMutation('pbBulkTranslateFieldValues', {
          ...ctx.value,
          clearOutdated: !!markUpToDate,
          items: items.map((item) => ({
            uuid: item.uuid,
            name: item.fieldName,
            value: item.fieldValue,
            langcode: item.langcode,
          })),
        }).then(mapMutation)
    }

    if (hasQuery('pbTextFieldValues')) {
      adapter.loadTextFieldValuesForLanguage = (langcode) =>
        useGraphqlQuery('pbTextFieldValues', {
          ...ctx.value,
          langcode,
        }).then((v) =>
          (v.data.state?.textFieldValues || []).map((tfv) => ({
            uuid: tfv.uuid,
            fieldName: tfv.fieldName,
            value: tfv.value,
            fieldType: tfv.fieldType as 'plain' | 'markup',
            entityType: tfv.entityType,
            entityBundle: tfv.entityBundle,
          })),
        )
    }

    if (hasMutation('pbRequestTranslation')) {
      adapter.requestTranslation = (items) =>
        useGraphqlMutation('pbRequestTranslation', {
          items: items.map((item) => ({
            key: item.key,
            text: item.text,
            isMarkup: item.isHtml,
            sourceLanguage: item.sourceLanguage,
            targetLanguage: item.targetLanguage,
          })),
        }).then((v) => ({
          success: v.data.result?.success ?? false,
          errors: v.data.result?.errors ?? undefined,
          data: (v.data.result?.items || []).map((item) => ({
            key: item.key,
            translatedText: item.text,
          })),
        }))
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
        .map<CommentItem | null>((item) => {
          if (item && 'uuid' in item) {
            return {
              uuid: item.uuid,
              blockUuids: (item.blockUuids || []).filter(falsy),
              resolved: !!item.resolved,
              body: item.body || '',
              created: item.created || '',
              updated: item.updated || undefined,
              parentUuid: item.parentUuid || undefined,
              user: {
                id: item.user?.id != null ? String(item.user.id) : '',
                name: item.user?.name || '',
                imageUrl: item.user?.imageUrl,
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
        }).then((v) => mapComments(v.data.action || []))
      adapter.replyToComment = (parentUuid, body) =>
        useGraphqlMutation('pbAddComment', {
          ...ctx.value,
          blockUuids: [],
          body,
          parentUuid,
        }).then((v) => mapComments(v.data.action || []))
    }

    if (hasMutation('pbEditComment')) {
      adapter.editComment = (uuid, body) =>
        useGraphqlMutation('pbEditComment', {
          ...ctx.value,
          uuid,
          body,
        }).then((v) => mapComments(v.data.action || []))
    }

    if (hasMutation('pbDeleteComment')) {
      adapter.deleteComment = (uuid) =>
        useGraphqlMutation('pbDeleteComment', {
          ...ctx.value,
          uuid,
        }).then((v) => mapComments(v.data.action || []))
    }

    if (hasMutation('pbResolveComment')) {
      adapter.resolveComment = (uuid) =>
        useGraphqlMutation('pbResolveComment', {
          ...ctx.value,
          uuid,
        }).then((v) => mapComments(v.data.action || []))
    }

    if (hasMutation('pbUnresolveComment')) {
      adapter.unresolveComment = (uuid) =>
        useGraphqlMutation('pbUnresolveComment', {
          ...ctx.value,
          uuid,
        }).then((v) => mapComments(v.data.action || []))
    }

    if (hasMutation('pbToggleCommentTaskItem')) {
      adapter.toggleCommentTask = (uuid, taskIndex) =>
        useGraphqlMutation('pbToggleCommentTaskItem', {
          ...ctx.value,
          uuid,
          taskIndex,
        }).then((v) => {
          const updated = mapComments(v.data.action || []).find(
            (c) => c.uuid === uuid,
          )
          if (!updated) {
            throw new Error(
              `Comment ${uuid} not found in toggleCommentTask response.`,
            )
          }
          return updated
        })
    }

    if (hasQuery('pbReferencedEntities')) {
      adapter.getReferencedEntities = (uuids) =>
        useGraphqlQuery('pbReferencedEntities', {
          ...ctx.value,
          uuids,
        }).then((v) =>
          (v.data.state?.referencedEntities || []).map((entity) => ({
            editUrl: entity.editUrl,
            entityBundle: entity.entityBundle,
            entityType: entity.entityType,
            entityUuid: entity.entityUuid,
            label: entity.label ?? '',
            uuids: entity.uuids || [],
          })),
        )
    }

    if (hasQuery('pbLibraryItems')) {
      adapter.getLibraryItems = (data) => {
        return useGraphqlQuery('pbLibraryItems', {
          bundles: data.bundles,
          filters: configObjectToUserConfigInput(data.filters),
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
            filters: mapPluginConfigInputs(response.data.result?.filters ?? []),
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
                description: plugin.description,
                bundles: plugin.bundles,
                targetBundles: plugin.targetBundles,
                min: plugin.min,
                max: plugin.max,
                configInputs: mapPluginConfigInputs(plugin.configInputs),
                preview: plugin.allowPreview,
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
                description: plugin.description,
                configInputs: mapPluginConfigInputs(plugin.configInputs),
                preview: plugin.allowPreview,
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

      adapter.previewTransformPlugin = (e) =>
        useGraphqlMutation('pbApplyTransformPlugin', {
          ...ctx.value,
          ...e,
          preview: true,
        }).then(mapMutation)
    }

    if (hasMutation('pbApplyHostTransformPlugin')) {
      adapter.applyHostTransformPlugin = (e) =>
        useGraphqlMutation('pbApplyHostTransformPlugin', {
          ...ctx.value,
          ...e,
        }).then(mapMutation)

      adapter.previewHostTransformPlugin = (e) =>
        useGraphqlMutation('pbApplyHostTransformPlugin', {
          ...ctx.value,
          ...e,
          preview: true,
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
      adapter.fragmentsAddBlock = (e) => {
        const options = e.options ? JSON.stringify(e.options) : undefined
        return useGraphqlMutation('pbAddFragmentParagraph', {
          ...ctx.value,
          hostType: e.host.type,
          hostFieldName: e.host.fieldName,
          hostUuid: e.host.uuid,
          afterUuid: e.preceedingUuid,
          name: e.name,
          options,
        }).then(mapMutation)
      }
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

    if (hasMutation('pbUpdateDroppableField')) {
      adapter.updateDroppableField = (e) =>
        useGraphqlMutation('pbUpdateDroppableField', {
          ...ctx.value,
          paragraphUuid:
            e.host.uuid === ctx.value.entityUuid ? null : e.host.uuid,
          fieldName: e.host.fieldName,
          itemIds: e.itemIds,
        }).then(mapMutation)
    }

    if (hasQuery('pbDroppableFieldItems')) {
      adapter.getDroppableFieldItems = (e) =>
        useGraphqlQuery('pbDroppableFieldItems', {
          ...ctx.value,
          paragraphUuid:
            e.host.uuid === ctx.value.entityUuid ? null : e.host.uuid,
          fieldName: e.host.fieldName,
        }).then((v) =>
          (v.data.state?.droppableFieldItems || []).map((item) => ({
            id: item.id,
            entityType: item.entityType,
            bundle: item.bundle,
            label: item.label,
            thumbnailSrc: item.thumbnailSrc ?? undefined,
            targetBundles: item.targetBundles,
          })),
        )
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
          filters: configObjectToUserConfigInput(e.filters),
          page: e.page,
        }).then((data) => {
          return {
            filters: mapPluginConfigInputs(
              data.data.pbMediaLibraryGetResults?.filters ?? [],
            ),
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
          paragraphBundle: e.targetBundle,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.preceedingUuid,
        }).then(mapMutation)
      }

      adapter.addEntityReferenceBlock = (e) => {
        return useGraphqlMutation('pbAddEntityReference', {
          ...ctx.value,
          targetId: e.entityId,
          targetType: e.entityType,
          targetBundle: e.entityBundle,
          paragraphBundle: e.bundle,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
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
              paragraphBundle: e.targetBundle,
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
          return (v.data.tabs ?? [])
            .map<ContentSearchTab | null>((tab) => {
              if (!tab) {
                return null
              }
              return {
                id: tab.id,
                title: tab.label,
                description: tab.description ?? null,
                types: tab.types.map((t) => ({
                  type: t.entityType,
                  bundles: t.bundles,
                })),
              }
            })
            .filter(falsy)
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
          })?.possibleParagraphBundles
        } else if (e.type === 'plaintext') {
          return config.clipboard.find((v) => {
            return (
              v?.__typename === 'ParagraphsBlokkliSupportedClipboardRichText'
            )
          })?.possibleParagraphBundles
        } else if (e.type === 'image') {
          return config.clipboard.find((v) => {
            return v?.__typename === 'ParagraphsBlokkliSupportedClipboardImage'
          })?.possibleParagraphBundles
        } else if (e.type === 'file') {
          return config.clipboard.find((v) => {
            return v?.__typename === 'ParagraphsBlokkliSupportedClipboardFile'
          })?.possibleParagraphBundles
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
          paragraphBundle: e.blockBundle,
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
          paragraphBundle: e.blockBundle,
        }).then(mapMutation)
      } else if (e.item.type === 'video' && hasMutation('pbAddVideoRemote')) {
        return useGraphqlMutation('pbAddVideoRemote', {
          ...ctx.value,
          url: e.item.data,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
          paragraphBundle: e.blockBundle,
        }).then(mapMutation)
      }
    }

    if (hasQuery('pbSearchEditStates')) {
      adapter.getEditStates = (e) => {
        return useGraphqlQuery('pbSearchEditStates', {
          page: e?.page,
          ...e?.filters,
        }).then((data) => {
          return {
            items: (data.data.pbSearchEditStates?.items || [])
              .map<GetEditStatesItem | null>((v) => {
                if (
                  v &&
                  v.uuid &&
                  v.hostEntityType &&
                  v.hostEntityUuid &&
                  v.label &&
                  v.url?.path
                ) {
                  return {
                    id: v.uuid,
                    hostEntityType: v.hostEntityType,
                    hostEntityUuid: v.hostEntityUuid,
                    label: v.label,
                    ownerName: v.uid?.name ?? '',
                    pendingChanges: v.mutations?.count ?? 0,
                    lastChanged: v.changedRawField?.first?.formatted ?? '',
                    url: v.url.path,
                    entity: v.entity,
                    currentUserIsOwner: v.currentUserIsOwner,
                  }
                }
                return null
              })
              .filter(falsy),
            total: data.data.pbSearchEditStates?.total || 0,
            perPage: data.data.pbSearchEditStates?.perPage || 0,
            filters: mapPluginConfigInputs(
              data.data.pbSearchEditStates?.filters ?? [],
            ),
          }
        })
      }
    }

    if (hasQuery('pbEntitiesSearch') && hasQuery('pbEditStatesSummary')) {
      adapter.getHostEntities = () => {
        return Promise.all([
          useGraphqlQuery('pbEntitiesSearch'),
          useGraphqlQuery('pbEditStatesSummary'),
        ]).then(([entitiesData, statesData]) => {
          const result = entitiesData.data.paragraphsBlokkliEntitiesSearch
          const summaries =
            statesData.data.paragraphsBlokkliEditStatesSummary ?? []

          const stateMap = new Map<
            string,
            { lastChanged: string; uid: string | null }
          >()
          for (const summary of summaries) {
            stateMap.set(
              `${summary.hostEntityType}:${summary.hostEntityUuid}`,
              {
                lastChanged: summary.lastChanged,
                uid: summary.uid ?? null,
              },
            )
          }

          const bundles: Record<string, string> = {}
          for (const bundle of result?.bundleLabels ?? []) {
            bundles[bundle.id] = bundle.label
          }

          return {
            items: (result?.items ?? []).map((v) => {
              const state = stateMap.get(`${v.entityType}:${v.uuid}`)
              return {
                id: v.id,
                uuid: v.uuid,
                entityType: v.entityType,
                bundle: v.bundle,
                label: v.label ?? '',
                url: v.url,
                lastChanged: state?.lastChanged ?? null,
                uid: state?.uid ?? null,
                context: v.context ?? undefined,
              }
            }),
            labelMap: {
              label: result?.entityTypeLabels?.[0]?.label ?? '',
              bundles,
            },
          }
        })
      }
    }

    if (hasQuery('pbSearchTemplates')) {
      adapter.templatesSearch = (e) => {
        return useGraphqlQuery('pbSearchTemplates', {
          filters: configObjectToUserConfigInput(e.filters),
          page: e.page,
          includeItems: e.includeItems,
        }).then((data) => {
          return {
            filters: mapPluginConfigInputs(data.data.results?.filters ?? []),
            items: (data.data.results?.items || [])
              .filter(falsy)
              .map<TemplateItem>((v) => {
                const permissions: EditPermission[] = []
                if (v.blokkliMetadata.canDelete) {
                  permissions.push('delete')
                }
                if (v.blokkliMetadata.canEdit) {
                  permissions.push('edit')
                }
                return {
                  uuid: v.uuid,
                  label: v.label ?? '',
                  description: v.description,
                  isDefault: !!v.isDefault,
                  itemBundles: v.templateBundles,
                  items: (v.items ?? []).filter(falsy),
                  permissions,
                  translationLanguages: v.translationLanguages,
                  metadata: {
                    description: v.description ?? null,
                    createdBy: v.blokkliMetadata.createdBy ?? null,
                    dateUpdated: v.blokkliMetadata.dateUpdated ?? null,
                    dateCreated: v.blokkliMetadata.dateCreated ?? null,
                  },
                }
              }),
            total: data.data.results?.total || 0,
            perPage: data.data.results?.perPage || 50,
          }
        })
      }
    }

    if (hasMutation('pbAddTemplate')) {
      adapter.templatesAdd = (e) => {
        return useGraphqlMutation('pbAddTemplate', {
          ...ctx.value,
          templateUuid: e.templateUuid,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        }).then(mapMutation)
      }
    }

    if (hasMutation('pbTemplateDelete')) {
      adapter.templatesDelete = (e) => {
        return useGraphqlMutation('pbTemplateDelete', {
          uuid: e.templateUuid,
        }).then((v) => {
          return {
            success: !!v.data.action.success,
            state: v.data.action.state,
            errors: (v.data.action.errors ?? []).filter(falsy),
          }
        })
      }
    }

    if (hasMutation('pbCreateTemplate')) {
      adapter.templatesCreate = (e) => {
        return useGraphqlMutation('pbCreateTemplate', {
          ...ctx.value,
          label: e.label,
          description: e.description,
          isDefault: e.isDefault,
          uuids: e.uuids,
        }).then(mapMutation)
      }
    }

    if (hasQuery('pbGetTemplateEntity') && templateEditRouteName) {
      try {
        const href = router.resolve({
          name: templateEditRouteName,
          params: {
            uuid: 'UUID_PLACEHOLDER',
          },
        }).path

        adapter.templatesGetEditUrl = (e) => {
          return (
            href.replace('UUID_PLACEHOLDER', e.templateUuid) +
            '?blokkliEditing=' +
            e.templateUuid
          )
        }
      } catch {
        console.error(
          `The provided templateEditRouteName "${templateEditRouteName}" is not valid. Editing templates will not be possible.`,
        )
      }
    }

    if (hasMutation('pbUnschedule')) {
      adapter.unscheduleEditState = (options) =>
        useGraphqlMutation('pbUnschedule', {
          entityType: options.hostEntityType.toUpperCase() as any,
          entityUuid: options.hostEntityUuid,
        }).then(mapMutation)
    }

    if (hasMutation('pbSchedule')) {
      adapter.scheduleEditState = (options) =>
        useGraphqlMutation('pbSchedule', {
          entityType: options.hostEntityType.toUpperCase() as any,
          entityUuid: options.hostEntityUuid,
          date: options.date,
          revisionLogMessage: options.revisionLogMessage,
        }).then(mapMutation)
    }

    if (hasMutation('pbSetParagraphSchedule')) {
      adapter.setBlockScheduleDate = (blocks) =>
        useGraphqlMutation('pbSetParagraphSchedule', {
          entityType: ctx.value.entityType,
          entityUuid: ctx.value.entityUuid,
          langcode: ctx.value.langcode,
          items: blocks,
        }).then(mapMutation)
    }

    if (hasMutation('pbSwapParagraphs')) {
      adapter.swapBlocks = (uuid1, uuid2) =>
        useGraphqlMutation('pbSwapParagraphs', {
          entityType: ctx.value.entityType,
          entityUuid: ctx.value.entityUuid,
          langcode: ctx.value.langcode,
          uuid1,
          uuid2,
        }).then(mapMutation)
    }

    if (hasMutation('pbReplaceEntityReference')) {
      adapter.replaceContentSearchItem = (data) =>
        useGraphqlMutation('pbReplaceEntityReference', {
          entityType: ctx.value.entityType,
          entityUuid: ctx.value.entityUuid,
          langcode: ctx.value.langcode,
          targetType: data.item.entityType,
          targetBundle: data.item.entityBundle,
          targetId: data.item.id,
          uuid: data.host.uuid,
        }).then(mapMutation)
    }

    if (hasMutation('pbAddMultipleParagraphs')) {
      type AddNewBlocksData = Parameters<
        NonNullable<typeof adapter.addNewBlocks>
      >[0]
      type EventBlock = AddNewBlocksData['blocks'][number]

      const mapBlockToGraphQL = (
        block: EventBlock,
      ): ParagraphsBlokkliAddMultipleItemInput => {
        const values: Record<string, unknown> = {}
        for (const entry of block.values ?? []) {
          const droppableConfig = config.droppableFieldConfig.find(
            (f) =>
              f.entityBundle === block.bundle && f.name === entry.fieldName,
          )
          if (droppableConfig) {
            if (droppableConfig.type === 'reference') {
              if (typeof entry.fieldValue !== 'string') {
                values[entry.fieldName] = {
                  target_id: entry.fieldValue.entityId,
                }
              }
            } else if (droppableConfig.type === 'link') {
              if (typeof entry.fieldValue === 'string') {
                values[entry.fieldName] = entry.fieldValue
              } else {
                values[entry.fieldName] =
                  `entity:${entry.fieldValue.entityType}/${entry.fieldValue.entityId}`
              }
            }
          } else if (typeof entry.fieldValue === 'string') {
            values[entry.fieldName] = entry.fieldValue
          }
        }

        return {
          bundle: block.bundle,
          uuid: block.blockUuid,
          values,
          options: block.options,
          children: block.children
            ? Object.entries(block.children).map(
                ([fieldName, childBlocks]) => ({
                  fieldName,
                  items: childBlocks.map(mapBlockToGraphQL),
                }),
              )
            : undefined,
        }
      }

      adapter.addNewBlocks = (data: AddNewBlocksData) =>
        useGraphqlMutation('pbAddMultipleParagraphs', {
          entityType: ctx.value.entityType,
          entityUuid: ctx.value.entityUuid,
          langcode: ctx.value.langcode,
          hostType: data.host.type,
          hostUuid: data.host.uuid,
          hostFieldName: data.host.fieldName,
          afterUuid: data.afterUuid,
          items: data.blocks.map(mapBlockToGraphQL),
        }).then(mapMutation)
    }

    if (hasMutation('paragraphsBlokkliAgentToken')) {
      adapter.getAgentAuthToken = function () {
        return useGraphqlMutation('paragraphsBlokkliAgentToken').then(
          (v) => v.data.token ?? null,
        )
      }
    }

    if (
      hasMutation('pbAgentConversationUpsert') &&
      hasMutation('pbAgentConversationDelete') &&
      hasQuery('pbAgentConversation') &&
      hasQuery('pbAgentConversationLatest') &&
      hasQuery('pbAgentConversations')
    ) {
      const hostInput = () => ({
        entityType: providedContext.value.entityType,
        entityUuid: providedContext.value.entityUuid,
      })

      type GqlFeedback = NonNullable<
        PbAgentConversationQuery['conversation']
      >['feedback'][number]

      const mapFeedback = (f: GqlFeedback) => ({
        id: f.id,
        createdAt: f.createdAt,
        rating: f.rating,
        comment: f.explanation ?? null,
        itemId: f.itemId,
        author: {
          id: String(f.author.id),
          name: f.author.name,
          imageUrl: f.author.imageUrl ?? null,
        },
        conversationUuid: f.conversationUuid,
      })

      const mapConversation = (c: PbAgentConversationQuery['conversation']) => {
        if (!c) return null
        return {
          uuid: c.uuid,
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          host: c.host
            ? {
                entityType: c.host.entityType,
                entityUuid: c.host.entityUuid,
                label: c.host.label ?? null,
                editUrl: c.host.editUrl ?? null,
              }
            : null,
          author: {
            id: String(c.author.id),
            name: c.author.name,
            imageUrl: c.author.imageUrl ?? null,
          },
          clientState: c.clientState,
          serverState: c.serverState,
          hash: c.hash,
          feedbackItemIds: c.feedback.map((f) => f.itemId),
          feedback: c.feedback.map(mapFeedback),
        }
      }

      adapter.agentConversations = {
        upsert: (data) =>
          useGraphqlMutation('pbAgentConversationUpsert', {
            ...{
              hostEntityType: providedContext.value.entityType,
              hostEntityUuid: providedContext.value.entityUuid,
            },
            uuid: data.uuid,
            title: data.title,
            dataUser: data.clientState,
            dataServer: data.serverState,
            hash: data.hash,
          }).then((v) => v.data.result.success),

        load: (uuid) =>
          useGraphqlQuery('pbAgentConversation', { uuid }).then((v) =>
            mapConversation(v.data.conversation),
          ),

        loadLatest: () =>
          useGraphqlQuery('pbAgentConversationLatest', {
            host: hostInput(),
          }).then((v) => mapConversation(v.data.conversation)),

        list: () =>
          useGraphqlQuery('pbAgentConversations', { host: hostInput() }).then(
            (v) => v.data.result.items,
          ),

        delete: (uuid) =>
          useGraphqlMutation('pbAgentConversationDelete', { uuid }).then(
            (v) => v.data.result.success,
          ),
      }

      if (hasMutation('pbAgentConversationFeedback')) {
        adapter.agentConversations.submitFeedback = (feedback) =>
          useGraphqlMutation('pbAgentConversationFeedback', {
            uuid: feedback.conversationId,
            itemId: feedback.lastItemId,
            rating: feedback.rating,
            explanation: feedback.comment,
          }).then((v) => v.data.result.success)
      }

      if (hasQuery('pbAgentConversationsAll')) {
        adapter.agentConversations.queryConversations = (e) =>
          useGraphqlQuery('pbAgentConversationsAll', { page: e.page }).then(
            (v) => ({
              filters: mapPluginConfigInputs(v.data.result.filters),
              items: v.data.result.items.map((c) => ({
                uuid: c.uuid,
                title: c.title,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                host: c.host
                  ? {
                      entityType: c.host.entityType,
                      entityUuid: c.host.entityUuid,
                      label: c.host.label ?? null,
                      editUrl: c.host.editUrl ?? null,
                    }
                  : null,
                author: {
                  id: String(c.author.id),
                  name: c.author.name,
                  imageUrl: c.author.imageUrl ?? null,
                },
              })),
              perPage: v.data.result.perPage,
              total: v.data.result.total,
            }),
          )
      }

      if (hasQuery('pbAgentFeedbackAll')) {
        adapter.agentConversations.queryFeedback = (e) =>
          useGraphqlQuery('pbAgentFeedbackAll', { page: e.page }).then((v) => ({
            filters: mapPluginConfigInputs(v.data.result.filters),
            items: v.data.result.items.map(mapFeedback),
            perPage: v.data.result.perPage,
            total: v.data.result.total,
          }))
      }
    }

    if (hasMutation('pbBulkUpdateFieldValues')) {
      adapter.updateFieldValueBatched = (data) => {
        const entityItems: ParagraphsBlokkliBulkUpdateFieldValuesInput[] =
          data.entityItems.map((item) => {
            return {
              name: item.fieldName,
              value: item.fieldValue,
            }
          })

        const blockItems: ParagraphsBlokkliBulkUpdateFieldValuesInput[] =
          data.items.map((item) => {
            return {
              uuid: item.uuid,
              name: item.fieldName,
              value: item.fieldValue,
            }
          })

        return useGraphqlMutation('pbBulkUpdateFieldValues', {
          ...ctx.value,
          items: [...entityItems, ...blockItems],
        }).then(mapMutation)
      }
    }

    if (hasMutation('pbRearrangeParagraphs')) {
      adapter.rearrangeBlocks = (data) => {
        return useGraphqlMutation('pbRearrangeParagraphs', {
          ...ctx.value,
          hostType: data.host.type,
          hostFieldName: data.host.fieldName,
          hostUuid: data.host.uuid,
          uuids: data.uuids,
        }).then(mapMutation)
      }
    }

    adapter.ignoreAnalyzeIdentifiers = (identifiers) =>
      useGraphqlMutation('pbIgnoreAnalyze', {
        ...ctx.value,
        ids: identifiers,
      }).then(mapMutation)

    adapter.unignoreAnalyzeIdentifiers = (identifiers) =>
      useGraphqlMutation('pbUnignoreAnalyze', {
        ...ctx.value,
        ids: identifiers,
      }).then(mapMutation)

    if (hasQuery('pbExportParagraphs')) {
      adapter.exportBlocksToTransferable = (e) =>
        useGraphqlQuery('pbExportParagraphs', {
          ...ctx.value,
          paragraphUuids: e.uuids,
        }).then((v) => {
          const result = v.data.result
          if (!result || !result.transferable) {
            return null
          }
          return {
            bundles: (result.bundles ?? []).filter(falsy),
            transferable: result.transferable,
          }
        })
    }

    if (hasMutation('pbImport')) {
      adapter.importBlocksFromTransferable = (e) =>
        useGraphqlMutation('pbImport', {
          ...ctx.value,
          transferable: e.transferable,
          hostType: e.host.type,
          hostUuid: e.host.uuid,
          hostFieldName: e.host.fieldName,
          afterUuid: e.afterUuid,
        }).then((v) => {
          const base = mapMutation(v)
          // The import summary lives on the most recent mutation's plugin
          // payload — null on every other plugin, so we just pick the last
          // non-null one in the returned mutations list.
          const mutations = base.state?.mutations ?? []
          let importSummary: ReturnType<typeof mapImportSummary> | undefined
          for (let i = mutations.length - 1; i >= 0; i--) {
            const summary = mutations[i]?.plugin?.importSummary
            if (summary) {
              importSummary = mapImportSummary(summary)
              break
            }
          }
          return { ...base, importSummary }
        })
    }

    return adapter
  },
) as BlokkliAdapterFactory<ParagraphsBlokkliEditStateFragment>
