import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import { mutationResultSchema, parentSchema } from '../schemas'
import { itemEntityType } from '#blokkli-build/config'

const blockSchema = z.object({
  bundle: z.string().describe('The block bundle to add'),
  values: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Optional default values for the block fields. Keys are field names, values are field values (strings for text fields, arrays of IDs for reference fields).',
    ),
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
    'Add one or more new blocks to the page. All blocks are added to the same parent field in the order specified. Requires user approval before the blocks are actually created.',
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
        for (const [fieldName, value] of Object.entries(block.values)) {
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
            const editableFields = types.editableFieldConfig
              .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
              .map((f) => f.name)
            const droppableFields = types.droppableFieldConfig
              .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
              .map((f) => f.name)
            const availableFields = [...editableFields, ...droppableFields]

            return {
              error:
                `Block ${i + 1}: Field "${fieldName}" does not exist on bundle "${block.bundle}". ` +
                (availableFields.length
                  ? `Available fields: ${availableFields.join(', ')}`
                  : 'This bundle has no editable or droppable fields.'),
            }
          }

          // Validate value type for editable fields (should be string)
          if (editableConfig && typeof value !== 'string') {
            return {
              error: `Block ${i + 1}: Field "${fieldName}" is a text field and expects a string value, got ${typeof value}.`,
            }
          }

          // Validate value type for droppable fields (should be array)
          if (droppableConfig && !Array.isArray(value)) {
            return {
              error: `Block ${i + 1}: Field "${fieldName}" is a reference field and expects an array of IDs, got ${typeof value}.`,
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
      // Include all blockUuids in the success result so AI knows the UUIDs
      result: { blockUuids },
    }
  },
})
