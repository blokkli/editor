import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({})

const blockSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  bundle: z.string().describe('The block type'),
  label: z.string().describe('Human-readable block label'),
})

const resultSchema = z.object({
  blocks: z.array(blockSchema).describe('Currently selected blocks'),
})

export default defineBlokkliAgentTool({
  name: 'get_selected_blocks',
  description:
    'Get the blocks currently selected by the user. Returns an empty array if nothing is selected.',
  category: 'query',
  volatile: true,
  prunedSummary: (r) => `${r.blocks?.length || 0} blocks selected`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetSelectedBlocksRunning', 'Getting selected blocks...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx) {
    const { selection, types, $t } = ctx.app

    const blocks = selection.uuids.value.map((uuid) => {
      const item = selection.items.value.find((v) => v.uuid === uuid)
      const bundle = item?.bundle ?? 'unknown'
      return {
        uuid,
        bundle,
        label: types.getBlockLabel(bundle),
      }
    })

    const count = blocks.length
    const label = count
      ? $t('aiAgentGetSelectedBlocksDone', '@count block(s) selected').replace(
          '@count',
          String(count),
        )
      : $t('aiAgentGetSelectedBlocksNone', 'No blocks selected')

    return {
      label,
      result: { blocks },
      affectedUuids: blocks.map((b) => b.uuid),
    }
  },
})
