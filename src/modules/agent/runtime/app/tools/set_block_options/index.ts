import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  getAvailableOptions,
  optionValueToStorable,
} from '#blokkli/editor/helpers/options'
import { mutationResultSchema } from '../schemas'
import { onlyUnique } from '#blokkli/helpers'

const blockOptionsSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  options: z
    .record(
      z.string(),
      z.union([z.string(), z.boolean(), z.number(), z.array(z.string())]),
    )
    .describe('Options to set as key-value pairs'),
})

const paramsSchema = z.object({
  blocks: z
    .array(blockOptionsSchema)
    .describe('Array of blocks with their options to set'),
})

export default defineBlokkliAgentTool({
  name: 'set_block_options',
  description:
    'Set options on one or more blocks. Each block entry contains a UUID and an options object with key-value pairs.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'updated options' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentSetBlockOptionsRunning', 'Setting block options...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateOptions'],
  execute(ctx, params) {
    const { blocks, definitions, selection } = ctx.app

    if (params.blocks.length === 0) {
      return { error: 'No blocks provided' }
    }

    // Validate all options before applying
    const validatedOptions: Array<{
      uuid: string
      key: string
      value: string
    }> = []
    const updatedBlocks = new Set<string>()

    for (const blockEntry of params.blocks) {
      const optionEntries = Object.entries(blockEntry.options)
      if (optionEntries.length === 0) {
        continue
      }

      // Check block exists
      const block = blocks.getBlock(blockEntry.uuid)
      if (!block) {
        return { error: `Block not found: ${blockEntry.uuid}` }
      }

      // Get block definition with context
      const selectionItem = selection.items.value.find(
        (v) => v.uuid === blockEntry.uuid,
      )
      const definition = definitions.getBlockDefinition(
        block.bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle,
      )

      if (!definition) {
        return {
          error: `Block definition not found for bundle: ${block.bundle}`,
        }
      }

      // Get available options for this block
      const availableOptions = getAvailableOptions(
        definition.options,
        definition.globalOptions as string[] | undefined,
        definitions.globalOptions.value as Record<string, any>,
      )

      // Validate and process each option
      for (const [key, value] of optionEntries) {
        // Check if the option key is valid
        const optionDef = availableOptions.find((o) => o.property === key)
        if (!optionDef) {
          return {
            error: `Option "${key}" is not available for block type "${block.bundle}"`,
          }
        }

        // Validate value against option type
        const optionType = optionDef.option.type

        // Type-specific validation
        if (optionType === 'checkbox') {
          if (
            typeof value !== 'boolean' &&
            value !== '1' &&
            value !== '0' &&
            value !== 'true' &&
            value !== 'false'
          ) {
            return {
              error: `Option "${key}" expects a boolean value`,
            }
          }
        } else if (optionType === 'radios') {
          if (typeof value !== 'string') {
            return {
              error: `Option "${key}" expects a string value`,
            }
          }
          // Validate against allowed options if defined
          if ('options' in optionDef.option && optionDef.option.options) {
            const allowedKeys = Object.keys(optionDef.option.options)
            if (!allowedKeys.includes(value)) {
              return {
                error: `Option "${key}" value must be one of: ${allowedKeys.join(', ')}`,
              }
            }
          }
        } else if (optionType === 'checkboxes') {
          if (!Array.isArray(value) && typeof value !== 'string') {
            return {
              error: `Option "${key}" expects an array of strings or comma-separated string`,
            }
          }
          // Validate against allowed options if defined
          if ('options' in optionDef.option && optionDef.option.options) {
            const allowedKeys = Object.keys(optionDef.option.options)
            const values = Array.isArray(value) ? value : value.split(',')
            for (const v of values) {
              if (!allowedKeys.includes(v)) {
                return {
                  error: `Option "${key}" value "${v}" is not allowed. Must be one of: ${allowedKeys.join(', ')}`,
                }
              }
            }
          }
        } else if (optionType === 'number' || optionType === 'range') {
          const numValue =
            typeof value === 'number' ? value : Number.parseFloat(String(value))
          if (Number.isNaN(numValue)) {
            return {
              error: `Option "${key}" expects a numeric value`,
            }
          }
          // Validate min/max bounds
          if ('min' in optionDef.option && numValue < optionDef.option.min) {
            return {
              error: `Option "${key}" value must be >= ${optionDef.option.min}`,
            }
          }
          if ('max' in optionDef.option && numValue > optionDef.option.max) {
            return {
              error: `Option "${key}" value must be <= ${optionDef.option.max}`,
            }
          }
        }

        // Convert value to storable string format
        const storableValue = optionValueToStorable(optionDef.option, value)

        validatedOptions.push({
          uuid: blockEntry.uuid,
          key,
          value: storableValue,
        })
      }

      updatedBlocks.add(blockEntry.uuid)
    }

    if (validatedOptions.length === 0) {
      return { error: 'No options to update' }
    }

    // Create descriptive label
    const blockCount = updatedBlocks.size
    const optionCount = validatedOptions.length
    const { $t } = ctx.app
    const label =
      blockCount === 1
        ? $t(
            'aiAgentUpdateOptionsOnBlockDone',
            'Updated @count option(s) on block',
          ).replace('@count', String(optionCount))
        : $t(
            'aiAgentUpdateOptionsOnBlocksDone',
            'Updated @count option(s) on @blockCount blocks',
          )
            .replace('@count', String(optionCount))
            .replace('@blockCount', String(blockCount))

    const affectedUuids = params.blocks.map((v) => v.uuid).filter(onlyUnique)

    return {
      type: 'options' as const,
      label,
      affectedUuids,
      apply: (adapter) => adapter.updateOptions(validatedOptions),
    }
  },
})
