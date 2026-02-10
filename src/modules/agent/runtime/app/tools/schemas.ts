import { z } from 'zod'
import type { OptionItem } from '#blokkli/editor/helpers/options'
import { getMutatedOptionValue } from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'
import type { BlokkliApp } from '#blokkli/editor/types/app'

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
  uuid: z.string().describe('The UUID of the parent entity or block'),
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
 * Shared schema for option values (used by add_blocks and set_block_options).
 */
export const optionValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.number(),
  z.array(z.string()),
])

/**
 * Validate a single option value against its definition.
 * Returns an error string or undefined if valid.
 */
export function validateOptionValue(
  key: string,
  value: string | boolean | number | string[],
  optionDef: OptionItem,
): string | undefined {
  const optionType = optionDef.option.type

  if (optionType === 'checkbox') {
    if (
      typeof value !== 'boolean' &&
      value !== '1' &&
      value !== '0' &&
      value !== 'true' &&
      value !== 'false'
    ) {
      return `Option "${key}" expects a boolean value`
    }
  } else if (optionType === 'radios') {
    if (typeof value !== 'string') {
      return `Option "${key}" expects a string value`
    }
    if ('options' in optionDef.option && optionDef.option.options) {
      const allowedKeys = Object.keys(optionDef.option.options)
      if (!allowedKeys.includes(value)) {
        return `Option "${key}" value must be one of: ${allowedKeys.join(', ')}`
      }
    }
  } else if (optionType === 'checkboxes') {
    if (!Array.isArray(value) && typeof value !== 'string') {
      return `Option "${key}" expects an array of strings or comma-separated string`
    }
    if ('options' in optionDef.option && optionDef.option.options) {
      const allowedKeys = Object.keys(optionDef.option.options)
      const values = Array.isArray(value) ? value : value.split(',')
      for (const v of values) {
        if (!allowedKeys.includes(v)) {
          return `Option "${key}" value "${v}" is not allowed. Must be one of: ${allowedKeys.join(', ')}`
        }
      }
    }
  } else if (optionType === 'number' || optionType === 'range') {
    const numValue =
      typeof value === 'number' ? value : Number.parseFloat(String(value))
    if (Number.isNaN(numValue)) {
      return `Option "${key}" expects a numeric value`
    }
    if ('min' in optionDef.option && numValue < optionDef.option.min) {
      return `Option "${key}" value must be >= ${optionDef.option.min}`
    }
    if ('max' in optionDef.option && numValue > optionDef.option.max) {
      return `Option "${key}" value must be <= ${optionDef.option.max}`
    }
  }

  return undefined
}

/**
 * Resolve an editable field config to its simplified type.
 * Returns 'plain' for text fields, 'markup' for rich text/frame fields, null for unsupported.
 */
export function getFieldType(
  app: BlokkliApp,
  entityType: string,
  bundle: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const config = app.types.editableFieldConfig.forName(
    entityType,
    bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

/**
 * Read the current value of an editable field on a block or entity.
 * Tries the registered getValue() callback first, falls back to DOM element reading.
 */
export function getEditableValue(
  app: BlokkliApp,
  entityType: string,
  uuid: string,
  bundle: string,
  fieldName: string,
  fieldType: 'plain' | 'markup',
): string {
  const editables = app.directive.getEditablesForBlock(uuid)
  const editable = editables.find((e) => e.fieldName === fieldName)

  if (editable?.getValue) {
    return editable.getValue()
  }

  const element = app.directive.findEditableElement(fieldName, {
    type: entityType,
    uuid,
    bundle,
  })
  if (element) {
    return fieldType === 'markup'
      ? element.innerHTML || ''
      : element.textContent || ''
  }

  return ''
}

/**
 * Get all child fields and their blocks for a given entity UUID.
 * Walks mutatedFields to find fields belonging to the entity.
 */
export function getBlockChildren(
  app: BlokkliApp,
  uuid: string,
): { fieldName: string; blocks: { uuid: string; bundle: string }[] }[] {
  const result: {
    fieldName: string
    blocks: { uuid: string; bundle: string }[]
  }[] = []

  for (const field of app.state.mutatedFields.value) {
    if (field.entityUuid === uuid && field.list.length > 0) {
      result.push({
        fieldName: field.name,
        blocks: field.list.map((item) => ({
          uuid: item.uuid,
          bundle: item.bundle,
        })),
      })
    }
  }

  return result
}

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
