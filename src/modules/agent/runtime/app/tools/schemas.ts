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
 * A parameter that accepts an array of strings OR a single string (normalized
 * to a one-element array). LLMs frequently send a bare string for array params
 * and otherwise fail validation on the first call. The generated JSON Schema
 * still advertises an array, so the model is guided toward the array form while
 * a single string is accepted as a fallback.
 */
export function stringArrayParam(description: string) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? [value] : value),
    z.array(z.string()).describe(description),
  )
}

/**
 * Wraps an object params schema to tolerate a singular key when the schema
 * actually expects its plural form (e.g. `uuid` → `uuids`). LLMs — especially
 * the smaller models — frequently pick the singular form when a tool
 * description mentions both ("one or more UUIDs"). Without this, the call
 * fails validation and the model often retries with the same wrong key.
 *
 * The generated JSON Schema is unchanged (the wrapping happens via
 * `z.preprocess`), so the model is still guided to the plural form; the
 * singular form is silently accepted as a fallback.
 */
export function tolerantSingularKeys<T extends z.ZodType>(
  schema: T,
  aliases: Record<string, string>,
) {
  return z.preprocess((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return value
    }
    const obj = value as Record<string, unknown>
    const remapped: Record<string, unknown> = {}
    let touched = false
    for (const key of Object.keys(obj)) {
      const plural = aliases[key]
      if (plural && !(plural in obj)) {
        remapped[plural] = obj[key]
        touched = true
      } else {
        remapped[key] = obj[key]
      }
    }
    return touched ? remapped : obj
  }, schema)
}

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
 * Shared result schema for the interactive field-diff rewrite tools
 * (`update_text_fields`, `delegate_text_rewrite`). Both present a diff approval
 * UI and report what the user accepted/rejected.
 */
const rejectedSegmentSchema = z.object({
  tag: z
    .string()
    .describe('HTML tag of the rejected chunk (e.g. "p", "li", "h2")'),
  beforeHtml: z
    .string()
    .describe(
      'The original innerHTML kept in the field (empty for newly inserted chunks that were rejected and dropped)',
    ),
  afterHtml: z
    .string()
    .describe(
      'The innerHTML you proposed for this chunk and the user rejected (empty for deletions that were rejected and restored)',
    ),
  status: z
    .enum(['matched', 'inserted', 'deleted'])
    .describe(
      'Whether your proposal modified an existing chunk (matched), added a new one (inserted), or removed one (deleted)',
    ),
  reasonForRejection: z
    .string()
    .describe('Per-chunk rejection reason; empty if none given'),
})

const fieldRejectionSchema = z.object({
  reasonForRejection: z
    .string()
    .describe(
      'Field-level rejection reason; empty when no reason given or when rejection is per-chunk (see `partial`)',
    ),
  partial: z
    .object({
      accepted: z
        .number()
        .describe('Number of changed chunks in this field the user accepted'),
      total: z
        .number()
        .describe('Total number of changed chunks in this field'),
      rejectedSegments: z
        .array(rejectedSegmentSchema)
        .describe(
          'Details for each rejected chunk. The field still gets updated with a hybrid value combining the accepted chunks and the original content of the rejected ones.',
        ),
    })
    .optional()
    .describe(
      'Present when the user evaluated chunk-by-chunk. When `accepted > 0`, the field was updated with a hybrid value; when `accepted === 0`, every chunk was rejected and the field stayed at its original value.',
    ),
})

export const fieldDiffResultSchema = z.object({
  acceptedCount: z.number().describe('Number of changes accepted by the user'),
  rejectedByUser: z
    .record(z.string(), z.record(z.string(), fieldRejectionSchema))
    .describe(
      'Map of paragraph UUID → field name → rejection details. A field appears here when at least one chunk was rejected (or, for non-chunked fields, when the whole field was rejected).',
    ),
  editedByUser: z
    .record(z.string(), z.record(z.string(), z.object({ value: z.string() })))
    .optional()
    .describe(
      'Map of paragraph UUID → field name → the value the user manually wrote in place of the suggestion before applying. Treat these as wording/style calibration.',
    ),
  label: z.string().describe('Human-readable summary shown in the UI'),
  agentMessage: z
    .string()
    .optional()
    .describe(
      'Detailed message for the agent, replaces label in the LLM context',
    ),
  historyIndex: z
    .number()
    .optional()
    .describe('The mutation history index after applying changes'),
})

/**
 * Schema for a single entry in a mutation's `newParagraphs` payload. Recursive
 * so nested children appear under their parent's `children` keyed by paragraph
 * field name — mirroring the input shape of `add_paragraphs`.
 */
type NewParagraphEntry = {
  uuid: string
  bundle: string
  paragraphFields?: string[]
  children?: Record<string, NewParagraphEntry[]>
}

const newParagraphEntrySchema: z.ZodType<NewParagraphEntry> = z.lazy(() =>
  z.object({
    uuid: z.string(),
    bundle: z.string(),
    paragraphFields: z
      .array(z.string())
      .optional()
      .describe(
        "Paragraph fields on this new paragraph that can hold nested paragraphs. Call get_child_paragraphs with this paragraph's UUID to add paragraphs to these fields.",
      ),
    children: z
      .record(
        z.string().describe('Paragraph field name'),
        z.array(newParagraphEntrySchema),
      )
      .optional()
      .describe(
        'Nested paragraphs created inside this entry, keyed by paragraph field name. Mirrors the `children` shape used by add_paragraphs — the structure round-trips, so a child here means it actually landed inside this parent.',
      ),
  }),
)

/**
 * Schema for the success result sent back to the AI after mutation is applied.
 */
export const mutationSuccessSchema = z.union([
  z.object({
    success: z.literal(true),
    newParagraphs: z
      .array(newParagraphEntrySchema)
      .optional()
      .describe(
        "Top-level paragraphs created by this mutation (for add/duplicate operations). Nested children appear under each entry's `children` keyed by paragraph field name; the tree mirrors what was requested.",
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
