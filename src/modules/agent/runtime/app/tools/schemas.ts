import { z } from 'zod'
import type { OptionItem } from '#blokkli/editor/helpers/options'
import { getMutatedOptionValue } from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'

/**
 * Extract a simple key→label map from the various radios/checkboxes option formats.
 * Handles plain strings, icon objects, color objects, grid objects, etc.
 */
function extractOptionLabels(
  option: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!('options' in option) || !option.options) return undefined

  const raw = option.options as Record<string, unknown>
  const labels: Record<string, string> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      labels[key] = value
    } else if (
      typeof value === 'object' &&
      value !== null &&
      'label' in value
    ) {
      labels[key] = String((value as { label: string }).label)
    } else {
      labels[key] = key
    }
  }

  return labels
}

/**
 * Shared schema for a single block option with its current value.
 */
export const blockOptionSchema = z.object({
  type: z
    .string()
    .describe(
      'The option type (checkbox, radios, checkboxes, text, number, range, color, datetime-local)',
    ),
  label: z.string().describe('The display label'),
  description: z.string().optional().describe('Optional description'),
  options: z
    .record(z.string(), z.string())
    .optional()
    .describe('Available choices for radios/checkboxes (key → label)'),
  min: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Minimum value for number/range/datetime-local types'),
  max: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Maximum value for number/range/datetime-local types'),
  step: z.number().optional().describe('Step increment for range type'),
  currentValue: z
    .union([z.string(), z.boolean(), z.number(), z.array(z.string())])
    .describe('The current value'),
})

/**
 * Shared schema for a record of block options keyed by property name.
 */
export const blockOptionsMapSchema = z.record(
  z.string().describe('Option property name'),
  blockOptionSchema,
)

export type BlockOptionsMap = z.infer<typeof blockOptionsMapSchema>

/**
 * Build a block options map from available options and mutated state.
 */
export function buildBlockOptionsMap(
  availableOptions: OptionItem[],
  mutatedOptions: Record<string, Record<string, string>>,
  uuid: string,
): BlockOptionsMap {
  const result: BlockOptionsMap = {}

  for (const opt of availableOptions) {
    const rawValue = getMutatedOptionValue(
      mutatedOptions,
      uuid,
      opt.property,
      opt.option.default,
    )
    const currentValue = getRuntimeOptionValue(opt.option, rawValue)

    const entry: BlockOptionsMap[string] = {
      type: opt.option.type,
      label: opt.option.label,
      currentValue,
    }

    if (opt.option.description) {
      entry.description = opt.option.description
    }

    const labels = extractOptionLabels(opt.option)
    if (labels) {
      entry.options = labels
    }

    if ('min' in opt.option) {
      entry.min = opt.option.min
    }

    if ('max' in opt.option) {
      entry.max = opt.option.max
    }

    if ('step' in opt.option && opt.option.type === 'range') {
      entry.step = opt.option.step
    }

    result[opt.property] = entry
  }

  return result
}

/**
 * Schema for a parent entity (the container of a block).
 * A parent is an entity + field combination where blocks can be placed.
 * Used consistently across tools for specifying block locations.
 */
export const parentSchema = z.object({
  type: z
    .string()
    .describe(
      'The entity type of the parent. Do NOT guess this - always use the parent object returned by get_child_blocks.',
    ),
  uuid: z
    .string()
    .describe('The UUID of the parent entity or block'),
  field: z
    .string()
    .describe(
      'The field name on the parent. Do NOT guess this - always use the parent object returned by get_child_blocks.',
    ),
})

/**
 * Schema for mutation tool results.
 * Mutation tools return either a MutationAction (handled by framework) or an error.
 */
export const mutationResultSchema = z.union([
  z.object({
    type: z
      .enum(['add', 'delete', 'move', 'rewrite', 'options'])
      .describe('Type of mutation'),
    label: z.string().describe('Human-readable description'),
  }),
  z.object({
    error: z.string().describe('Error message if the mutation failed'),
  }),
])

/**
 * Schema for the success result sent back to the AI after mutation is applied.
 */
export const mutationSuccessSchema = z.union([
  z.object({
    success: z.literal(true),
    newBlocks: z
      .array(
        z.object({
          uuid: z.string(),
          bundle: z.string(),
          blockFields: z
            .array(z.string())
            .optional()
            .describe(
              "Block fields on this new block that can hold nested blocks. Call get_child_blocks with this block's UUID to add blocks to these fields.",
            ),
        }),
      )
      .optional()
      .describe(
        'Blocks created by this mutation (for add/duplicate operations), with their UUIDs and bundle types',
      ),
    historyIndex: z
      .number()
      .describe('Current position in mutation history (-1 = pristine)'),
  }),
  z.object({
    success: z.literal(false),
    rejected: z
      .literal(true)
      .optional()
      .describe('True if user rejected the change'),
  }),
  z.object({
    error: z.string().describe('Error message'),
  }),
])
