import { z } from 'zod'

/**
 * Schema for a parent entity (the container of a block).
 * A parent is an entity + field combination where blocks can be placed.
 * Used consistently across tools for specifying block locations.
 */
export const parentSchema = z.object({
  type: z.string(),
  uuid: z.string(),
  field: z.string(),
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
