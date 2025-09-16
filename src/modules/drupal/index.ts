import { createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { isInterfaceType, isObjectType, type GraphQLField } from 'graphql'
import { defineBlokkliModule } from '../defineBlokkliModule'
import { useGraphqlModuleContext } from 'nuxt-graphql-middleware/utils'
import { logger } from './../../module/logger'

function toPascalCase(text: string) {
  return text.replace(/(^\w|_\w)/g, clearAndUpper)
}

function clearAndUpper(text: string) {
  return text.replace(/_/, '').toUpperCase()
}

export default defineBlokkliModule({
  alterOptions(options) {
    // Set default options for blökkli starterkit setups.
    if (!options.itemEntityType) {
      options.itemEntityType = 'paragraph'
    }

    // Default pattern to look for blökkli components.
    // ~ resolves to the app dir (./ in Nuxt 3, ./app in Nuxt 4).
    if (!options.pattern) {
      options.pattern = [
        '~/components/Paragraph/**/*.vue',
        '~/components/Node/**/*.vue',
        '~/components/TaxonomyTerm/**/*.vue',
        '~/components/CommerceProduct/**/*.vue',
        '~/components/Storage/**/*.vue',
      ]
    }

    // Provide the default Drupal edit adapter if no custom adapter is defined.
    // If the user has a custom adapter in ~/blokkli.editAdapter.ts, the module
    // will use that one.
    // This option basically only applies if:
    // - no custom editAdapterPath is set
    // - and no custom editAdapter file exists.
    if (!options.editAdapterPath) {
      const resolver = createResolver(
        fileURLToPath(new URL('./', import.meta.url)),
      )
      const filePath = resolver.resolve('./runtime/adapter/index.js')
      options.editAdapterPath = filePath
    }

    // Add a default implementation for generating prop types for paragraph
    // bundles. This assumes the name of every paragraph fragment is always
    // "paragraph" + the PascalCase string of the bundle, for example:
    // bundle: "two_columns" has a fragment "paragraphTwoColumns", so the
    // generated type is "ParagraphTwoColumnsFragment".
    if (!options.getBundlePropsType) {
      options.getBundlePropsType = function (bundle) {
        return {
          typeName: `Paragraph${toPascalCase(bundle)}Fragment`,
          from: '#graphql-operations',
        }
      }
    }
  },
  setup({ context }) {
    // First try to get nuxt-graphql-middleware module context without
    // throwing an error, so that we can log additional information on what
    // needs to be done.
    if (!useGraphqlModuleContext({ nullOnMissing: true })) {
      logger.box(
        'Failed to load nuxt-graphql-middleware module context. Make sure that "nuxt-graphql-middleware" is placed before "@blokkli/editor" in your "modules" config in nuxt.config.ts.',
      )

      throw new Error('Failed to initialise blökkli Drupal module.')
    }

    const graphql = useGraphqlModuleContext()

    const blokkliModuleResolver = createResolver(
      fileURLToPath(new URL('./', import.meta.url)),
    )

    const filePath = blokkliModuleResolver.resolve('./runtime')
    context.helper.addAlias('#blokkli/drupal', filePath)

    /**
     * Build a map of fields for an object or interface type.
     */
    function getTypeFields(
      typeName: string,
    ): Map<string, GraphQLField<any, any>> {
      const type = graphql.schemaGetType(typeName)
      if (isObjectType(type) || isInterfaceType(type)) {
        const fields = type.getFields()
        return new Map(Object.entries(fields))
      }

      return new Map()
    }

    const queryFields = getTypeFields('Query')
    const editStateFields = getTypeFields('ParagraphsBlokkliEditState')
    const editMutationStateFields = getTypeFields('ParagraphsEditMutationState')

    // Resolve GraphQL files.
    const resolver = createResolver(
      join(fileURLToPath(new URL('./', import.meta.url)), 'graphql'),
    )

    /**
     * Registers a GraphQL file.
     */
    function addGraphqlDocument(fileName: string) {
      const filePath = resolver.resolve(fileName)
      graphql.addImportFile(filePath)
    }

    /**
     * Registers a GraphQL mutation conditionally.
     *
     * If the mutation does not exist in the schema, the feature is disabled.
     */
    function addMutation(mutationName: string, feature?: string) {
      if (editMutationStateFields.has(mutationName)) {
        addGraphqlDocument(`mutations/${mutationName}.graphql`)
      } else if (feature) {
        context.features.disableFeature(feature)
      }
    }

    // Add base documents that are required for the basic blökkli features.
    const base = [
      'fragment.paragraphsBlokkliEditState.graphql',
      'fragment.paragraphsBlokkliMutatedField.graphql',
      'fragment.paragraphsBlokkliMutationItem.graphql',
      'fragment.paragraphsBlokkliMutationResult.graphql',
      'fragment.paragraphsBlokkliViolation.graphql',
      'fragment.ParagraphsBlokkliConfigInput.graphql',
      'fragment.blokkliProps.graphql',
      'fragment.paragraphsFieldItem.graphql',
      'query.pbConfig.graphql',
      'query.pbEntityConfig.graphql',
      'query.pbEditState.graphql',
    ]

    base.forEach((fileName) => {
      addGraphqlDocument('base/' + fileName)
    })

    // Add mutations only if they exist in the schema.
    addMutation('add')
    addMutation('add_clipboard_text')
    addMutation('add_entity_reference')
    addMutation('add_entity_reference_multiple')
    addMutation('add_file')
    addMutation('add_image')
    addMutation('add_video_remote')
    addMutation('bulk_update_behavior_settings')
    addMutation('duplicate', 'duplicate')
    addMutation('move')
    addMutation('move_multiple')
    addMutation('redo')
    addMutation('remove')
    addMutation('remove_multiple')
    addMutation('replace_host_entity_media')
    addMutation('replace_media')
    addMutation('revertAllChanges', 'revert')
    addMutation('setHistoryIndex', 'history')
    addMutation('setMutationStatus')
    addMutation('takeOwnership')
    addMutation('undo')
    addMutation('update_behavior_setting')
    addMutation('update_field_value')
    addMutation('update_host_entity_field_value')
    addMutation('update_host_options')

    // Feature: Comments.
    if (graphql.schemaHasType('CommentBlokkliNode')) {
      addGraphqlDocument('features/comments.graphql')
    } else {
      context.features.disableFeature('comments')
    }

    // Feature: Fragments.
    if (graphql.schemaHasType('ParagraphBlokkliFragment')) {
      addGraphqlDocument('features/fragments.graphql')
    } else {
      context.features.disableFeature('fragments')
    }

    // Feature: Transform.
    if (graphql.schemaHasType('ParagraphsBlokkliTransformPlugin')) {
      addGraphqlDocument('features/transform.graphql')
    } else {
      context.features.disableFeature('transform')
    }

    // Feature: Host Transform.
    if (graphql.schemaHasType('ParagraphsBlokkliHostTransformPlugin')) {
      addGraphqlDocument('features/transform_host.graphql')
    }

    // Feature: Library.
    if (graphql.schemaHasType('ParagraphFromLibrary')) {
      addGraphqlDocument('features/library.graphql')
    } else {
      context.features.disableFeature('library')
    }

    // Feature: Search.
    if (graphql.schemaHasType('ParagraphsBlokkliSearchTab')) {
      addGraphqlDocument('features/search.graphql')
    } else {
      context.features.disableFeature('search')
    }

    // Feature: Conversions.
    if (graphql.schemaHasType('ParagraphsBlokkliConversion')) {
      addGraphqlDocument('features/conversions.graphql')
    } else {
      context.features.disableFeature('conversions')
    }

    // Feature: Import Existing.
    if (queryFields.has('pbGetImportSourceEntities')) {
      addGraphqlDocument('features/import-existing.graphql')
    } else {
      context.features.disableFeature('import-existing')
    }

    // Feature: Media Library.
    if (queryFields.has('pbMediaLibraryGetResults')) {
      addGraphqlDocument('features/media-library.graphql')
    } else {
      context.features.disableFeature('media-library')
    }

    // Feature: Preview Grant.
    if (editStateFields.has('previewUrl')) {
      addGraphqlDocument('features/preview-grant.graphql')
    } else {
      context.features.disableFeature('preview-grant')
    }

    // Enable the new publish options.
    if (
      editStateFields.has('publishOptions') &&
      queryFields.has('pbSearchEditStates')
    ) {
      addGraphqlDocument('features/publishNew.graphql')
    } else {
      addGraphqlDocument('features/publish.graphql')
    }
  },
})
