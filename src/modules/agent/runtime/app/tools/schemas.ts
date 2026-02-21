import { z } from 'zod'

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
 * Schema for a parent entity (the container of a block).
 * A parent is an entity + field combination where blocks can be placed.
 * Used consistently across tools for specifying block locations.
 */
export const parentSchema = z.object({
  type: z
    .string()
    .describe(
      'The entity type of the parent. Do NOT guess this - always use the parent object returned by get_child_paragraphs.',
    ),
  uuid: z.string().describe('The UUID of the parent entity or paragraph'),
  field: z
    .string()
    .describe(
      'The field name on the parent. Do NOT guess this - always use the parent object returned by get_child_paragraphs.',
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
 * Shared schema for option values (used by add_blocks and set_block_options).
 */
export const optionValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.number(),
  z.array(z.string()),
])

/**
 * Shared schema for the `position` parameter used by mutation tools that insert blocks.
 *
 * Values:
 * - `"start"` — insert at the beginning of the field
 * - `"end"` (default when omitted) — append at the end of the field
 * - `"after:<UUID>"` — insert after the block with the given UUID
 * - `"before:<UUID>"` — insert before the block with the given UUID
 */
export const positionSchema = z
  .string()
  .optional()
  .default('end')
  .describe(
    'Where to place the paragraph(s). "start" = beginning, "end" (default) = append at end, "after:<UUID>" = after a specific paragraph, "before:<UUID>" = before a specific paragraph.',
  )

/**
 * Schema for the success result sent back to the AI after mutation is applied.
 */
export const mutationSuccessSchema = z.union([
  z.object({
    success: z.literal(true),
    newParagraphs: z
      .array(
        z.object({
          uuid: z.string(),
          bundle: z.string(),
          paragraphFields: z
            .array(z.string())
            .optional()
            .describe(
              "Paragraph fields on this new paragraph that can hold nested paragraphs. Call get_child_paragraphs with this paragraph's UUID to add paragraphs to these fields.",
            ),
        }),
      )
      .optional()
      .describe(
        'Paragraphs created by this mutation (for add/duplicate operations), with their UUIDs and bundle types',
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
