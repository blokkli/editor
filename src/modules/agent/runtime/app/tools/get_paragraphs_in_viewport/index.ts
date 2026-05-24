import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { booleanParam } from '#blokkli/agent/shared/toolParams'
import type { BlokkliApp } from '#blokkli/editor/types/app'

const paramsSchema = z.object({
  maxNestingLevel: z.coerce
    .number()
    .optional()
    .describe(
      'Maximum nesting depth to include (0 = only root paragraphs, 1 = root + direct children, etc.). Omit for unlimited depth.',
    ),
  includeDimensions: booleanParam(
    'Include x, y, width, height for each paragraph (default: false)',
  )
    .optional()
    .default(false),
})

// Block dimensions in artboard coordinates
type BlockDimensions = {
  x: number
  y: number
  width: number
  height: number
}

// Nested blocks don't need parent info (it's implicit from tree structure)
type NestedBlock = {
  uuid: string
  bundle: string
  label: string
  dimensions?: BlockDimensions
  children?: Record<string, NestedBlock[]>
}

// Root blocks include visibility and parent info
type RootBlock = NestedBlock & {
  visibilityPercent: number
  parent: {
    type: string
    uuid: string
    field: string
  }
}

// Options passed to tree building functions
type BuildOptions = {
  includeDimensions: boolean
  maxNestingLevel?: number
  currentLevel: number
}

const dimensionsSchema = z.object({
  x: z.number().describe('X position in artboard coordinates'),
  y: z.number().describe('Y position in artboard coordinates'),
  width: z.number().describe('Width in pixels'),
  height: z.number().describe('Height in pixels'),
})

// Schema for nested blocks (no visibility or parent)
const nestedBlockSchema: z.ZodType<NestedBlock> = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
  label: z.string().describe('Human-readable paragraph label'),
  dimensions: dimensionsSchema
    .optional()
    .describe('Paragraph position and size (if requested)'),
  children: z
    .record(z.string(), z.array(z.lazy(() => nestedBlockSchema)))
    .optional()
    .describe('Child paragraphs organized by field name'),
})

// Schema for root blocks (includes visibility and parent)
const rootBlockSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
  label: z.string().describe('Human-readable paragraph label'),
  dimensions: dimensionsSchema
    .optional()
    .describe('Paragraph position and size (if requested)'),
  visibilityPercent: z
    .number()
    .describe('Percentage of paragraph area visible in viewport (0-100)'),
  parent: z
    .object({
      type: z.string().describe('Parent entity type'),
      uuid: z.string().describe('Parent entity UUID'),
      field: z.string().describe('Field name containing this paragraph'),
    })
    .describe('Parent field information'),
  children: z
    .record(z.string(), z.array(nestedBlockSchema))
    .optional()
    .describe('Child paragraphs organized by field name'),
})

const resultSchema = z.object({
  paragraphs: z
    .array(rootBlockSchema)
    .describe('Root-level paragraphs currently visible in the viewport'),
})

function getDimensions(app: BlokkliApp, uuid: string): BlockDimensions {
  const rect = app.dom.getBlockRect(uuid)
  if (!rect) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function calculateVisibility(app: BlokkliApp, uuid: string): number {
  const artboardRect = app.dom.getBlockRect(uuid)
  if (!artboardRect) return 0

  const viewport = app.ui.visibleViewport.value

  // Convert artboard-relative rect to viewport-relative
  const rect = app.ui.getViewportRelativeRect(artboardRect)

  // Calculate intersection of block rect with viewport
  const intersectX = Math.max(
    0,
    Math.min(rect.x + rect.width, viewport.x + viewport.width) -
      Math.max(rect.x, viewport.x),
  )
  const intersectY = Math.max(
    0,
    Math.min(rect.y + rect.height, viewport.y + viewport.height) -
      Math.max(rect.y, viewport.y),
  )
  const intersectArea = intersectX * intersectY
  const blockArea = rect.width * rect.height

  if (blockArea === 0) return 0
  return Math.round((intersectArea / blockArea) * 100)
}

// Build tree for nested blocks (no visibility or parent info)
function buildNestedBlockTree(
  app: BlokkliApp,
  uuid: string,
  options: BuildOptions,
): NestedBlock {
  const block = app.blocks.getBlock(uuid)
  const bundle = block?.bundle ?? 'unknown'
  const result: NestedBlock = {
    uuid,
    bundle,
    label: app.types.getBlockLabel(bundle),
  }

  if (options.includeDimensions) {
    result.dimensions = getDimensions(app, uuid)
  }

  // Check if we should include children based on maxNestingLevel
  const shouldIncludeChildren =
    options.maxNestingLevel === undefined ||
    options.currentLevel < options.maxNestingLevel

  if (shouldIncludeChildren) {
    // Find child fields for this block
    const mutatedFields = app.state.mutatedFields.value
    const childFields: Record<string, NestedBlock[]> = {}

    for (const field of mutatedFields) {
      if (field.entityUuid === uuid && field.list.length > 0) {
        childFields[field.name] = field.list.map((item) =>
          buildNestedBlockTree(app, item.uuid, {
            ...options,
            currentLevel: options.currentLevel + 1,
          }),
        )
      }
    }

    if (Object.keys(childFields).length > 0) {
      result.children = childFields
    }
  }

  return result
}

// Build tree for root blocks (includes visibility and parent info)
function buildRootBlockTree(
  app: BlokkliApp,
  uuid: string,
  options: BuildOptions,
): RootBlock {
  const block = app.blocks.getBlock(uuid)
  const bundle = block?.bundle ?? 'unknown'

  // Get parent field info for root block
  const parentField = app.state.getFieldListForBlock(uuid)
  const parent = parentField
    ? {
        type: parentField.entityType,
        uuid: parentField.entityUuid,
        field: parentField.name,
      }
    : { type: 'unknown', uuid: 'unknown', field: 'unknown' }

  const result: RootBlock = {
    uuid,
    bundle,
    label: app.types.getBlockLabel(bundle),
    visibilityPercent: calculateVisibility(app, uuid),
    parent,
  }

  if (options.includeDimensions) {
    result.dimensions = getDimensions(app, uuid)
  }

  // Check if we should include children based on maxNestingLevel
  const shouldIncludeChildren =
    options.maxNestingLevel === undefined ||
    options.currentLevel < options.maxNestingLevel

  if (shouldIncludeChildren) {
    // Find child fields for this block
    const mutatedFields = app.state.mutatedFields.value
    const childFields: Record<string, NestedBlock[]> = {}

    for (const field of mutatedFields) {
      if (field.entityUuid === uuid && field.list.length > 0) {
        childFields[field.name] = field.list.map((item) =>
          buildNestedBlockTree(app, item.uuid, {
            ...options,
            currentLevel: options.currentLevel + 1,
          }),
        )
      }
    }

    if (Object.keys(childFields).length > 0) {
      result.children = childFields
    }
  }

  return result
}

export default defineBlokkliAgentTool({
  name: 'get_paragraphs_in_viewport',
  description:
    'Get paragraphs currently visible in the viewport with their visibility percentage. Use this for viewport-relative queries like "the paragraph at the top", "what\'s in the center", or "paragraphs near the bottom". NOT for getting all page content - use get_all_page_content for that.',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => `${r.paragraphs?.length || 0} paragraphs in viewport`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t(
      'aiAgentGetBlocksInViewportRunning',
      'Getting blocks in viewport',
      {
        more: true,
      },
    )
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { dom, state, $t } = ctx.app
    const visibleUuids = dom.getVisibleBlocks()

    const buildOptions: BuildOptions = {
      includeDimensions: params.includeDimensions ?? false,
      maxNestingLevel: params.maxNestingLevel,
      currentLevel: 0,
    }

    // Filter to root blocks (nesting level = 0) and build trees
    const rootUuids = visibleUuids.filter(
      (uuid) => state.getNestingLevel(uuid) === 0,
    )
    const blockTrees = rootUuids.map((uuid) =>
      buildRootBlockTree(ctx.app, uuid, buildOptions),
    )

    // Sort by visibility (most visible first)
    blockTrees.sort((a, b) => b.visibilityPercent - a.visibilityPercent)

    return {
      label: $t(
        'aiAgentGetBlocksInViewportDone',
        'Got @count blocks in viewport',
      ).replace('@count', String(blockTrees.length)),
      result: {
        paragraphs: blockTrees,
      },
    }
  },
})
