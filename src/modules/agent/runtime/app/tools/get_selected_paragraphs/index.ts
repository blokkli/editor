import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({})

const paragraphSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
  label: z.string().describe('Human-readable paragraph label'),
})

const resultSchema = z.object({
  paragraphs: z
    .array(paragraphSchema)
    .describe('Currently selected paragraphs'),
})

export default defineBlokkliAgentTool({
  name: 'get_selected_paragraphs',
  description:
    'Get the paragraphs currently selected by the user. Returns an empty array if nothing is selected.',
  category: 'query',
  volatile: true,
  prunedSummary: (r) => `${r.paragraphs?.length || 0} paragraphs selected`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetSelectedBlocksRunning', 'Getting selected blocks...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx) {
    const { selection, types, $t } = ctx.app

    const paragraphs = selection.items.value.map((item) => {
      const bundle = item?.bundle ?? 'unknown'
      return {
        uuid: item.uuid,
        bundle,
        label: types.getBlockLabel(bundle),
      }
    })

    const count = paragraphs.length
    const label = count
      ? $t('aiAgentGetSelectedBlocksDone', '@count block(s) selected').replace(
          '@count',
          String(count),
        )
      : $t('aiAgentGetSelectedBlocksNone', 'No blocks selected')

    return {
      label,
      result: { paragraphs },
      affectedUuids: paragraphs.map((b) => b.uuid),
    }
  },
})
