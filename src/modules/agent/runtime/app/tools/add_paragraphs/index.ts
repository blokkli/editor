import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { generateUUID } from '#blokkli/editor/helpers/uuid'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
  optionValueSchema,
} from '../schemas'
import {
  resolvePosition,
  validateOptionValue,
  getResolvedOptions,
  resolveHost,
} from '../helpers'
import { validateFieldCardinality } from '../../helpers/validation'
import { getFieldKey } from '#blokkli/helpers'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { AddNewBlocksEventBlock } from '#blokkli/editor/events'
import type { BlockBundleWithNested } from '#blokkli-build/generated-types'
import { optionValueToStorable } from '#blokkli/editor/helpers/options'
import { countNewParagraphs } from '#blokkli/agent/app/helpers/mutationResult'

const contentFieldValueSchema = z.union([
  z
    .string()
    .describe(
      'Text value for plain/markup content fields, or a URL string (starting with http) for link content fields',
    ),
  z
    .object({
      entityType: z.string().describe('Entity type (e.g., "media", "node")'),
      entityId: z.string().describe('Entity ID'),
    })
    .describe(
      'Entity reference for reference content fields (media, content references)',
    ),
])

const contentFieldsSchema = z
  .record(
    z.string().describe('The content field name'),
    contentFieldValueSchema,
  )
  .optional()
  .describe(
    'Content field values to set on the new paragraph, keyed by field name. Use this to set text content and media/entity references in one step.',
  )

type OptionValue = string | boolean | number | string[]

type BlockInput = {
  bundle: string
  contentFields?: Record<
    string,
    string | { entityType: string; entityId: string }
  >
  options?: Record<string, OptionValue>
  children?: Record<string, BlockInput[]>
}

const blockSchema: z.ZodType<BlockInput> = z.object({
  bundle: z.string().describe('The paragraph bundle to add'),
  contentFields: contentFieldsSchema,
  options: z
    .record(z.string(), optionValueSchema)
    .optional()
    .describe(
      'Paragraph options to set as key-value pairs (e.g. alignment, style). Use get_bundle_info to see available options.',
    ),
  children: z
    .record(
      z.string().describe('Paragraph field name'),
      z
        .lazy(() => z.array(blockSchema))
        .describe('Child paragraphs for this field'),
    )
    .optional()
    .describe(
      'Nested child paragraphs keyed by paragraph field name. Recursive — children can also have children.',
    ),
})

const paramsSchema = z.object({
  paragraphs: z
    .array(blockSchema)
    .min(1)
    .describe('Array of paragraphs to add, in order'),
  parent: parentSchema.describe('The parent entity to add the paragraphs to'),
  position: positionSchema,
})

/**
 * Validate content fields for a single block.
 * Returns an error string or undefined if valid.
 */
function validateContentFields(
  ctx: McpToolContext,
  block: BlockInput,
  path: string,
): string | undefined {
  if (!block.contentFields) return undefined

  for (const [fieldName, fieldValue] of Object.entries(block.contentFields)) {
    const editableConfig = ctx.app.types.editableFieldConfig.forName(
      ctx.itemEntityType,
      block.bundle,
      fieldName,
    )

    const droppableConfig = ctx.app.types.droppableFieldConfig.forName(
      ctx.itemEntityType,
      block.bundle,
      fieldName,
    )

    if (!editableConfig && !droppableConfig) {
      const editableFieldNames = ctx.app.types.editableFieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
        .map((f) => f.name)
      const droppableFieldNames = ctx.app.types.droppableFieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
        .map((f) => f.name)
      const availableFields = [...editableFieldNames, ...droppableFieldNames]

      return (
        `${path}: Field "${fieldName}" does not exist on bundle "${block.bundle}". ` +
        (availableFields.length
          ? `Available content fields: ${availableFields.join(', ')}`
          : 'This bundle has no content fields.')
      )
    }

    if (editableConfig && typeof fieldValue !== 'string') {
      return `${path}: Field "${fieldName}" is a text field and expects a string value, got ${typeof fieldValue}.`
    }

    if (droppableConfig) {
      if (typeof fieldValue === 'string' && droppableConfig.type !== 'link') {
        return `${path}: Field "${fieldName}" is a reference field and expects { entityType, entityId }, got a string.`
      }
    }
  }

  return undefined
}

/**
 * Validate options for a single block.
 * Returns an error string or undefined if valid.
 */
function validateBlockOptions(
  ctx: McpToolContext,
  block: BlockInput,
  path: string,
  parentBundle: BlockBundleWithNested | null,
): string | undefined {
  if (!block.options) return undefined

  const availableOptions = getResolvedOptions(
    ctx.app,
    block.bundle,
    'default',
    parentBundle,
  )

  if (!availableOptions) {
    return `${path}: Paragraph definition not found for bundle "${block.bundle}".`
  }

  for (const [key, value] of Object.entries(block.options)) {
    const optionDef = availableOptions.find((o) => o.property === key)
    if (!optionDef) {
      const availableKeys = availableOptions.map((o) => o.property)
      return (
        `${path}: Option "${key}" is not available for bundle "${block.bundle}". ` +
        (availableKeys.length
          ? `Available options: ${availableKeys.join(', ')}`
          : 'This bundle has no options.')
      )
    }

    const valueError = validateOptionValue(key, value, optionDef)
    if (valueError) {
      return `${path}: ${valueError}`
    }
  }

  return undefined
}

/**
 * Recursively validate the block tree.
 * Returns an error string or undefined if the entire tree is valid.
 */
function validateBlockTree(
  ctx: McpToolContext,
  blocks: BlockInput[],
  allowedBundles: string[],
  fieldLabel: string,
  pathPrefix: string,
  parentBundle: BlockBundleWithNested | null,
): string | undefined {
  const { types } = ctx.app

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    const path = `${pathPrefix}Paragraph ${i + 1}`

    // Check if bundle exists
    const bundleDefinition = types.getBlockBundleDefinition(block.bundle)
    if (!bundleDefinition) {
      return `${path}: Bundle "${block.bundle}" does not exist.`
    }

    // Check if bundle is allowed in the target field
    if (allowedBundles.length && !allowedBundles.includes(block.bundle)) {
      return `${path}: Bundle "${block.bundle}" is not allowed in field "${fieldLabel}". Allowed bundles: ${allowedBundles.join(', ')}`
    }

    // Check add permission for the bundle
    if (!ctx.app.permissions.checkBlockBundlePermission(block.bundle, 'add')) {
      return `${path}: Permission denied: cannot add "${bundleDefinition.label}" blocks.`
    }

    // Validate content fields
    const contentError = validateContentFields(ctx, block, path)
    if (contentError) return contentError

    // Validate options
    const optionsError = validateBlockOptions(ctx, block, path, parentBundle)
    if (optionsError) return optionsError

    // Validate children recursively
    if (block.children) {
      for (const [childFieldName, childBlocks] of Object.entries(
        block.children,
      )) {
        const childFieldConfig = types.fieldConfig.forName(
          ctx.itemEntityType,
          block.bundle,
          childFieldName,
        )

        if (!childFieldConfig) {
          const availableBlockFields = types.fieldConfig
            .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
            .map((f) => f.name)
          return (
            `${path}: Paragraph field "${childFieldName}" does not exist on bundle "${block.bundle}". ` +
            (availableBlockFields.length
              ? `Available paragraph fields: ${availableBlockFields.join(', ')}`
              : 'This bundle has no paragraph fields.')
          )
        }

        if (!childBlocks.length) continue

        // The parent block is freshly created, so this field starts empty —
        // validate the requested children against the field's cardinality
        // (-1 means unlimited).
        if (
          childFieldConfig.cardinality !== -1 &&
          childBlocks.length > childFieldConfig.cardinality
        ) {
          return `${path}: Field "${childFieldName}" can only hold ${childFieldConfig.cardinality} paragraph(s), but ${childBlocks.length} were provided.`
        }

        const childError = validateBlockTree(
          ctx,
          childBlocks,
          childFieldConfig.allowedBundles,
          childFieldName,
          `${path} > ${childFieldName} > `,
          block.bundle as BlockBundleWithNested,
        )
        if (childError) return childError
      }
    }
  }

  return undefined
}

/**
 * Recursively transform validated BlockInput[] into AddNewBlocksEventBlock[].
 * Generates UUIDs, converts contentFields to values array, and converts options to storable strings.
 */
function buildEventBlocks(
  ctx: McpToolContext,
  blocks: BlockInput[],
  parentBundle: BlockBundleWithNested | null,
): AddNewBlocksEventBlock[] {
  return blocks.map((block) => {
    const blockUuid = generateUUID()

    const values = block.contentFields
      ? Object.entries(block.contentFields).map(([fieldName, fieldValue]) => ({
          fieldName,
          fieldValue,
        }))
      : undefined

    let options: Record<string, string> | undefined
    if (block.options) {
      const availableOptions = getResolvedOptions(
        ctx.app,
        block.bundle,
        'default',
        parentBundle,
      )
      if (availableOptions) {
        options = {}
        for (const [key, value] of Object.entries(block.options)) {
          const optionDef = availableOptions.find((o) => o.property === key)
          if (optionDef) {
            options[key] = optionValueToStorable(optionDef.option, value)
          }
        }
      }
    }

    let children: Record<string, AddNewBlocksEventBlock[]> | undefined
    if (block.children) {
      children = {}
      for (const [fieldName, childBlocks] of Object.entries(block.children)) {
        if (childBlocks.length) {
          children[fieldName] = buildEventBlocks(
            ctx,
            childBlocks,
            block.bundle as BlockBundleWithNested,
          )
        }
      }
    }

    return {
      bundle: block.bundle,
      blockUuid,
      values,
      options,
      children,
    }
  })
}

/**
 * Count total blocks in the tree (including nested children).
 */
function countBlocks(blocks: AddNewBlocksEventBlock[]): number {
  let count = blocks.length
  for (const block of blocks) {
    if (block.children) {
      for (const childBlocks of Object.values(block.children)) {
        count += countBlocks(childBlocks)
      }
    }
  }
  return count
}

/**
 * Collect all UUIDs from the block tree.
 */
function collectAllUuids(blocks: AddNewBlocksEventBlock[]): string[] {
  const uuids: string[] = []
  for (const block of blocks) {
    uuids.push(block.blockUuid)
    if (block.children) {
      for (const childBlocks of Object.values(block.children)) {
        uuids.push(...collectAllUuids(childBlocks))
      }
    }
  }
  return uuids
}

export default defineBlokkliAgentTool({
  name: 'add_paragraphs',
  description:
    'Add one or more new paragraphs to the page. Supports nested structures via the `children` property — define entire paragraph trees in a single call. IMPORTANT: Always provide content field values (text, media/entity references) directly via contentFields, instead of adding empty paragraphs! For reference content fields (media), set the value to { entityType, entityId } from search_media results. NOTE: You can ONLY provide content fields, NOT paragraph fields! For nested paragraphs, use the `children` property keyed by paragraph field name. You can also set paragraph options inline via the `options` property (key-value pairs). The success result mirrors the input shape: each top-level entry in `newParagraphs` includes its own `children` keyed by paragraph field, so the structure round-trips and a nested child does NOT appear as a sibling — treat the tree as the source of truth instead of guessing from order.',
  category: 'mutation',
  lazy: false,
  prunedSummary: (r) =>
    r.success
      ? `added ${countNewParagraphs(r.newParagraphs ?? [])} paragraphs`
      : 'rejected',
  modes: ['editing'],
  label($t) {
    return $t('aiAgentAddBlocksRunning', 'Adding blocks', { more: true })
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addNewBlocks'],
  execute(ctx, params) {
    const { types } = ctx.app

    // Determine if parent is the root entity or a block
    const host = resolveHost(ctx.app, params.parent.uuid)
    if (!host) {
      return {
        error: `Parent paragraph "${params.parent.uuid}" not found. Use get_page_structure or get_child_paragraphs to find a valid parent UUID.`,
      }
    }
    const { entityType, bundle, isRoot: isRootEntity } = host

    const field = types.getFieldConfig(entityType, bundle, params.parent.field)

    if (!field) {
      const availableFields = types.fieldConfig
        .forEntityTypeAndBundle(entityType, bundle)
        .map((f) => f.name)
      return {
        error: `Field "${params.parent.field}" not found on bundle "${bundle}". Available fields: ${availableFields.length ? availableFields.join(', ') : 'none'}. Use get_child_paragraphs to get the correct parent object.`,
      }
    }

    // Validate the target field can hold the new top-level paragraphs alongside
    // its existing children (-1 cardinality means unlimited).
    const cardinality = validateFieldCardinality(
      ctx.app,
      {
        type: entityType,
        uuid: params.parent.uuid,
        fieldName: params.parent.field,
        bundle,
      },
      getFieldKey(params.parent.uuid, params.parent.field),
      params.paragraphs.length,
    )
    if (!cardinality.valid) {
      return { error: cardinality.error }
    }

    // Check ancestor restrictions on the target parent
    if (!isRootEntity) {
      if (ctx.app.permissions.blockHasRestrictedAncestor(params.parent.uuid)) {
        return {
          error:
            'Permission denied: target parent is inside a block with restricted editing permissions',
        }
      }
    }

    // Recursively validate the entire block tree
    const topLevelParentBundle = isRootEntity
      ? null
      : (bundle as BlockBundleWithNested)
    const validationError = validateBlockTree(
      ctx,
      params.paragraphs,
      field.allowedBundles,
      params.parent.field,
      '',
      topLevelParentBundle,
    )
    if (validationError) {
      return { error: validationError }
    }

    // Build the event tree with UUIDs and storable options
    const eventBlocks = buildEventBlocks(
      ctx,
      params.paragraphs,
      topLevelParentBundle,
    )
    const totalCount = countBlocks(eventBlocks)
    const blockUuids = collectAllUuids(eventBlocks)

    const { $t } = ctx.app
    const label =
      totalCount === 1
        ? $t('aiAgentAddBlockDone', 'Added @bundle').replace(
            '@bundle',
            types.getBlockLabel(eventBlocks[0]!.bundle),
          )
        : $t('aiAgentAddBlocksDone', 'Added @count blocks').replace(
            '@count',
            String(totalCount),
          )

    // Resolve position to afterUuid
    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

    return {
      type: 'add' as const,
      label,
      apply: (adapter) =>
        adapter.addNewBlocks({
          blocks: eventBlocks,
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          afterUuid: resolved.afterUuid,
        }),
      affectedUuids: blockUuids,
    }
  },
})
