import { z } from 'zod'
import { defineBlokkliMcpTool } from '#blokkli/agent/app/composables'
import {
  getAvailableOptions,
  getMutatedOptionValue,
} from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'

const optionDefinitionSchema = z.object({
  type: z
    .string()
    .describe(
      'The option type (checkbox, radios, checkboxes, text, number, range, color, datetime-local)',
    ),
  label: z.string().describe('The display label'),
  default: z
    .union([z.string(), z.boolean(), z.number(), z.array(z.string())])
    .optional()
    .describe('The default value'),
  description: z.string().optional().describe('Optional description'),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Available choices for radios/checkboxes types'),
  min: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Minimum value for number/range/datetime-local types'),
  max: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Maximum value for number/range/datetime-local types'),
  step: z.number().optional().describe('Step increment for range type'),
})

const blockOptionsSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  bundle: z.string().describe('The block type'),
  options: z
    .array(
      z.object({
        property: z.string().describe('The option property name'),
        definition: optionDefinitionSchema.describe('The option definition'),
        currentValue: z
          .union([z.string(), z.boolean(), z.number(), z.array(z.string())])
          .describe('The current value'),
      }),
    )
    .describe('Available options with their current values'),
})

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The block UUIDs to get options for'),
})

const resultSchema = z.object({
  blocks: z.array(blockOptionsSchema).describe('Options for each found block'),
  notFound: z.array(z.string()).describe('UUIDs of blocks that were not found'),
})

export default defineBlokkliMcpTool({
  name: 'get_block_options',
  description:
    'Get available options and their current values for one or more blocks',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) =>
    $t('aiAgentGetBlockOptionsRunning', 'Getting block options...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { blocks, state, definitions, selection, $t } = ctx.app

    const result: z.infer<typeof resultSchema> = {
      blocks: [],
      notFound: [],
    }

    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        result.notFound.push(uuid)
        continue
      }

      // Get block definition with context
      const selectionItem = selection.items.value.find((v) => v.uuid === uuid)
      const definition = definitions.getBlockDefinition(
        block.bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle,
      )

      if (!definition) {
        result.notFound.push(uuid)
        continue
      }

      // Get available options using shared helper
      const availableOptions = getAvailableOptions(
        definition.options,
        definition.globalOptions as string[] | undefined,
        definitions.globalOptions.value as Record<string, any>,
      )

      // Build options with current values
      const optionsWithValues = availableOptions.map((opt) => {
        const rawValue = getMutatedOptionValue(
          state.mutatedOptions,
          uuid,
          opt.property,
          opt.option.default,
        )
        const currentValue = getRuntimeOptionValue(opt.option, rawValue)

        // Build definition object with type-specific fields
        const def: z.infer<typeof optionDefinitionSchema> = {
          type: opt.option.type,
          label: opt.option.label,
          default: opt.option.default,
        }

        if (opt.option.description) {
          def.description = opt.option.description
        }

        if ('options' in opt.option && opt.option.options) {
          def.options = opt.option.options
        }

        if ('min' in opt.option) {
          def.min = opt.option.min
        }

        if ('max' in opt.option) {
          def.max = opt.option.max
        }

        if ('step' in opt.option && opt.option.type === 'range') {
          def.step = opt.option.step
        }

        return {
          property: opt.property,
          definition: def,
          currentValue,
        }
      })

      result.blocks.push({
        uuid,
        bundle: block.bundle,
        options: optionsWithValues,
      })
    }

    // Build label based on results
    const { types } = ctx.app
    const count = result.blocks.length
    const firstBlock = result.blocks[0]
    const label =
      count === 1 && firstBlock
        ? $t('aiAgentGetBlockOptionsDone', 'Got options of @bundle').replace(
            '@bundle',
            types.getBlockLabel(firstBlock.bundle),
          )
        : $t(
            'aiAgentGetBlockOptionsMultipleDone',
            'Got options of @count blocks',
          ).replace('@count', String(count))

    // Select the blocks that were found
    const affectedUuids = result.blocks.map((b) => b.uuid)

    return { label, result, affectedUuids }
  },
})
