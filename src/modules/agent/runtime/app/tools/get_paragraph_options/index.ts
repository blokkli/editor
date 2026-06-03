import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { blockOptionsMapSchema } from '../schemas'
import { buildBlockOptionsMap, getResolvedOptions } from '../helpers'

export const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The paragraph UUIDs to get options for'),
})

export const resultSchema = z.record(
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
    return $t('aiAgentGetBlockOptionsRunning', 'Getting block options', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { blocks, state, selection, types, $t } = ctx.app

    const result: z.infer<typeof resultSchema> = {}
    const affectedUuids: string[] = []

    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) continue

      // For from_library blocks, use the reusable block's actual bundle.
      const bundle = block.library?.reusableBundle || block.bundle
      const selectionItem = selection.items.value.find((v) => v.uuid === uuid)
      const availableOptions = getResolvedOptions(
        ctx.app,
        bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle ?? null,
      )

      if (!availableOptions) continue

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
