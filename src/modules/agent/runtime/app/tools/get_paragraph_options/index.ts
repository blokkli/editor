import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { getAvailableOptions } from '#blokkli/editor/helpers/options'
import { blockOptionsMapSchema } from '../schemas'
import { buildBlockOptionsMap } from '../helpers'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The paragraph UUIDs to get options for'),
})

const resultSchema = z.record(
  z.string().describe('Paragraph UUID'),
  blockOptionsMapSchema.describe('Options for this paragraph'),
)

export default defineBlokkliAgentTool({
  name: 'get_paragraph_options',
  description:
    'Get available options and their current values for one or more paragraphs',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => `options for ${Object.keys(r || {}).length} paragraphs`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetBlockOptionsRunning', 'Getting block options...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { blocks, state, definitions, selection, types, $t } = ctx.app

    const result: z.infer<typeof resultSchema> = {}
    const affectedUuids: string[] = []

    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) continue

      // For from_library blocks, use the reusable block's actual bundle.
      const bundle = block.library?.reusableBundle || block.bundle
      const selectionItem = selection.items.value.find((v) => v.uuid === uuid)
      const definition = definitions.getBlockDefinition(
        bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle,
      )

      if (!definition) continue

      const availableOptions = getAvailableOptions(
        definition.options,
        definition.globalOptions as string[] | undefined,
        definitions.globalOptions.value as Record<string, any>,
      )

      result[uuid] = buildBlockOptionsMap(
        availableOptions,
        state.mutatedOptions,
        uuid,
      )
      affectedUuids.push(uuid)
    }

    const count = affectedUuids.length
    const firstUuid = affectedUuids[0]
    const firstBlock = firstUuid ? blocks.getBlock(firstUuid) : null
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

    return { label, result, affectedUuids }
  },
})
