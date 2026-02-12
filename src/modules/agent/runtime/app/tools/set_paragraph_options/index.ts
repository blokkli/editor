import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  getAvailableOptions,
  optionValueToStorable,
} from '#blokkli/editor/helpers/options'
import {
  mutationResultSchema,
  optionValueSchema,
  validateOptionValue,
} from '../schemas'
import { onlyUnique } from '#blokkli/helpers'

const paragraphOptionsSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  options: z
    .record(z.string(), optionValueSchema)
    .describe('Options to set as key-value pairs'),
})

const paramsSchema = z.object({
  paragraphs: z
    .array(paragraphOptionsSchema)
    .describe('Array of paragraphs with their options to set'),
})

export default defineBlokkliAgentTool({
  name: 'set_paragraph_options',
  description:
    'Set options on one or more paragraphs. Each paragraph entry contains a UUID and an options object with key-value pairs.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'updated options' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentSetBlockOptionsRunning', 'Setting block options...')
  },
  lazy: true,
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateOptions'],
  execute(ctx, params) {
    const { blocks, definitions, selection } = ctx.app

    if (params.paragraphs.length === 0) {
      return { error: 'No paragraphs provided' }
    }

    // Validate all options before applying
    const validatedOptions: Array<{
      uuid: string
      key: string
      value: string
    }> = []
    const updatedBlocks = new Set<string>()

    for (const blockEntry of params.paragraphs) {
      const optionEntries = Object.entries(blockEntry.options)
      if (optionEntries.length === 0) {
        continue
      }

      // Check block exists
      const block = blocks.getBlock(blockEntry.uuid)
      if (!block) {
        return { error: `Paragraph not found: ${blockEntry.uuid}` }
      }

      // For from_library blocks, use the reusable block's actual bundle.
      const bundle = block.library?.reusableBundle || block.bundle
      const selectionItem = selection.items.value.find(
        (v) => v.uuid === blockEntry.uuid,
      )
      const definition = definitions.getBlockDefinition(
        bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle,
      )

      if (!definition) {
        return {
          error: `Paragraph definition not found for bundle: ${bundle}`,
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
        const optionDef = availableOptions.find((o) => o.property === key)
        if (!optionDef) {
          return {
            error: `Option "${key}" is not available for paragraph type "${bundle}"`,
          }
        }

        const valueError = validateOptionValue(key, value, optionDef)
        if (valueError) {
          return { error: valueError }
        }

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

    const affectedUuids = params.paragraphs
      .map((v) => v.uuid)
      .filter(onlyUnique)

    return {
      type: 'options' as const,
      label,
      affectedUuids,
      apply: (adapter) => adapter.updateOptions(validatedOptions),
    }
  },
})
