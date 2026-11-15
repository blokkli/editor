import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { getGuide } from '../composition_helpers'

export default defineBlokkliAgentTool({
  name: 'get_composition_guide',
  description:
    "Get the style guide for compositions: the components and their attributes, the allowed HTML elements, the design tokens as CSS custom properties, the breakpoints, and the rules of a composition's CSS. Call it once before you write a composition.",
  category: 'query',
  lazy: true,
  prunedSummary: () => 'composition style guide',
  modes: ['editing', 'readonly', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetCompositionGuideRunning', 'Reading the style guide', {
      more: true,
    })
  },
  paramsSchema: z.object({}),
  resultSchema: z.object({ guide: z.string() }),
  execute(ctx) {
    return {
      label: ctx.app.$t(
        'aiAgentGetCompositionGuideDone',
        'Read the style guide',
      ),
      result: { guide: getGuide(ctx.app) },
    }
  },
})
