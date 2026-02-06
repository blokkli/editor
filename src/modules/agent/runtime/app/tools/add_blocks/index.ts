import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import { mutationResultSchema, parentSchema } from '../schemas'
import { itemEntityType } from '#blokkli-build/config'

const fieldValueSchema = z
  .array(
    z.object({
      fieldName: z.string().describe('The field name'),
      fieldValue: z
        .union([
          z
            .string()
            .describe(
              'Text value for plain/markup content fields, or a URL string (starting with http) for link content fields',
            ),
          z
            .object({
              entityType: z
                .string()
                .describe('Entity type (e.g., "media", "node")'),
              entityId: z.string().describe('Entity ID'),
            })
            .describe(
              'Entity reference for reference content fields (media, content references)',
            ),
        ])
        .describe(
          'The field value: a string for plain/markup content fields, an entity reference object for reference content fields, or a URL string for link content fields',
        ),
    }),
  )
  .optional()
  .describe(
    'Field values to set on the new block. Use this to set text content and media/entity references on content fields in one step.',
  )

const blockSchema = z.object({
  bundle: z.string().describe('The block bundle to add'),
  values: fieldValueSchema,
})

const paramsSchema = z.object({
  blocks: z
    .array(blockSchema)
    .min(1)
    .describe('Array of blocks to add, in order'),
  parent: parentSchema.describe('The parent entity to add the blocks to'),
  afterUuid: z
    .string()
    .nullable()
    .optional()
    .describe('UUID of block to insert after, or null for beginning'),
})

export default defineBlokkliAgentTool({
  name: 'add_blocks',
  description:
    'Add one or more new blocks to the page. All blocks are added to the same parent field in the order specified. IMPORTANT: Always provide values for content fields (text, media/entity references) directly, instead of adding empty blocks! For reference content fields (media), set the value to { entityType, entityId } from search_media results. NOTE: You can ONLY provide content fields, NOT block fields! Nested blocks need to be created in separate calls.',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) => $t('aiAgentAddBlocksRunning', 'Adding blocks...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addNewBlocks'],
  execute: (ctx, params) => {
    const { types, context, blocks } = ctx.app

    // Determine if parent is the root entity or a block
    const isRootEntity = params.parent.uuid === context.value.entityUuid
    const entityType = isRootEntity ? context.value.entityType : itemEntityType
    const bundle = isRootEntity
      ? context.value.entityBundle
      : blocks.getBlock(params.parent.uuid)?.bundle

    if (!bundle) {
      return {
        error: 'Parent not found.',
      }
    }

    const field = types.getFieldConfig(entityType, bundle, params.parent.field)

    if (!field) {
      return {
        error: 'Field not found.',
      }
    }

    const allowedBundles = field.allowedBundles

    // Validate each block
    for (let i = 0; i < params.blocks.length; i++) {
      const block = params.blocks[i]!

      // Check if bundle exists
      const bundleDefinition = types.getBlockBundleDefinition(block.bundle)
      if (!bundleDefinition) {
        return {
          error: `Block ${i + 1}: Bundle "${block.bundle}" does not exist.`,
        }
      }

      // Check if bundle is allowed in the target field
      if (allowedBundles.length && !allowedBundles.includes(block.bundle)) {
        return {
          error: `Block ${i + 1}: Bundle "${block.bundle}" is not allowed in field "${params.parent.field}". Allowed bundles: ${allowedBundles.join(', ')}`,
        }
      }

      // Validate values if provided
      if (block.values) {
        for (const entry of block.values) {
          const { fieldName, fieldValue } = entry

          // Check if field is editable (text fields)
          const editableConfig = types.editableFieldConfig.forName(
            ctx.itemEntityType,
            block.bundle,
            fieldName,
          )

          // Check if field is droppable (reference fields)
          const droppableConfig = types.droppableFieldConfig.forName(
            ctx.itemEntityType,
            block.bundle,
            fieldName,
          )

          if (!editableConfig && !droppableConfig) {
            // Get available fields for error message
            const editableFieldNames = types.editableFieldConfig
              .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
              .map((f) => f.name)
            const droppableFieldNames = types.droppableFieldConfig
              .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
              .map((f) => f.name)
            const availableFields = [
              ...editableFieldNames,
              ...droppableFieldNames,
            ]

            return {
              error:
                `Block ${i + 1}: Field "${fieldName}" does not exist on bundle "${block.bundle}". ` +
                (availableFields.length
                  ? `Available content fields: ${availableFields.join(', ')}`
                  : 'This bundle has no content fields.'),
            }
          }

          // Validate value type for editable fields (should be string)
          if (editableConfig && typeof fieldValue !== 'string') {
            return {
              error: `Block ${i + 1}: Field "${fieldName}" is a text field and expects a string value, got ${typeof fieldValue}.`,
            }
          }

          // Validate value type for droppable fields
          if (droppableConfig) {
            if (
              typeof fieldValue === 'string' &&
              droppableConfig.type !== 'link'
            ) {
              return {
                error: `Block ${i + 1}: Field "${fieldName}" is a reference field and expects { entityType, entityId }, got a string.`,
              }
            }
          }
        }
      }
    }

    // Generate UUIDs for all blocks
    const blocksWithUuids = params.blocks.map((block) => ({
      bundle: block.bundle,
      blockUuid: generateUUID(),
      values: block.values,
    }))

    const { $t } = ctx.app
    const label =
      blocksWithUuids.length === 1
        ? $t('aiAgentAddBlockDone', 'Added @bundle').replace(
            '@bundle',
            types.getBlockLabel(blocksWithUuids[0]!.bundle),
          )
        : $t('aiAgentAddBlocksDone', 'Added @count blocks').replace(
            '@count',
            String(blocksWithUuids.length),
          )
    const blockUuids = blocksWithUuids.map((b) => b.blockUuid)

    // Return the action for the framework to handle
    return {
      type: 'add' as const,
      label,
      apply: (adapter) =>
        adapter.addNewBlocks({
          blocks: blocksWithUuids,
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          afterUuid: params.afterUuid ?? null,
        }),
      affectedUuids: blockUuids,
    }
  },
})
