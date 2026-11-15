import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '#blokkli/agent/app/tools/schemas'
import {
  prepareCompositionUpdate,
  findCompositionOptionKey,
  readAgentSource,
} from '../composition_helpers'

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count++
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

export default defineBlokkliAgentTool({
  name: 'edit_composition',
  description:
    'Change part of a composition: replaces old_string in its source with new_string. old_string must match the source exactly (whitespace included) and occur exactly once, unless replace_all is set. Call get_composition first. In a translation, only the texts between the tags change.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'edited composition' : 'rejected'),
  modes: ['editing', 'translating'],
  lazy: true,
  label($t) {
    return $t('aiAgentEditCompositionRunning', 'Editing composition', {
      more: true,
    })
  },
  paramsSchema: z.object({
    uuid: z.string().describe('UUID of the composition paragraph'),
    old_string: z
      .string()
      .describe('The text to replace, exactly as in the source'),
    new_string: z.string().describe('The text to put in its place'),
    replace_all: z
      .boolean()
      .optional()
      .describe('Replace every occurrence instead of exactly one'),
  }),
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateComposition'],
  async execute(ctx, params) {
    const option = findCompositionOptionKey(ctx, params.uuid)
    if ('error' in option) return option

    const source = await readAgentSource(ctx.app, params.uuid, option.key)
    if (!params.old_string) {
      return { error: 'old_string is empty.' }
    }
    const count = countOccurrences(source, params.old_string)
    if (count === 0) {
      return {
        error:
          'old_string was not found in the source. Call get_composition and copy the text exactly, whitespace included.',
      }
    }
    if (count > 1 && !params.replace_all) {
      return {
        error: `old_string occurs ${count} times. Add more of the surrounding text so that it occurs once, or set replace_all.`,
      }
    }
    const next = params.replace_all
      ? source.split(params.old_string).join(params.new_string)
      : source.replace(params.old_string, () => params.new_string)

    const result = await prepareCompositionUpdate(
      ctx.app,
      params.uuid,
      option.key,
      next,
    )
    if ('error' in result) return result

    return {
      type: 'options' as const,
      label: ctx.app.$t('aiAgentEditCompositionDone', 'Edited composition'),
      affectedUuids: [params.uuid],
      apply: (adapter) => adapter.updateComposition(result.event),
    }
  },
})
