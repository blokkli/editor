import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import Component from './Component.vue'

const optionSchema = z.object({
  value: z.string().describe('The option value'),
  label: z.string().describe('The display label'),
})

const paramsSchema = z.object({
  question: z.string().describe('The question to ask the user'),
  options: z.array(optionSchema).describe('Available options to choose from'),
  multiSelect: z
    .boolean()
    .default(false)
    .describe(
      `Allow selecting multiple options. If false, the user has the option to enter a custom option if none of the options are good.`,
    ),
  paragraphUuids: z
    .array(z.string())
    .optional()
    .describe(
      'Optional UUIDs of paragraphs this question relates to. When provided, these paragraphs will be highlighted on the page.',
    ),
})

const resultSchema = z.object({
  selected: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .describe('Selected value(s), or null if cancelled'),
  label: z
    .string()
    .optional()
    .describe('Human-readable label of what was selected (for UI display)'),
})

export type AskQuestionParams = z.infer<typeof paramsSchema>
export type AskQuestionResult = z.infer<typeof resultSchema>

export default defineBlokkliAgentTool({
  name: 'ask_question',
  description:
    'Ask the user a question with predefined options. The tool will automatically add a "none of the above" option where the user can define a custom option.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentAskQuestionRunning', 'Waiting for answer...')
  },
  paramsSchema,
  resultSchema,
  component: Component,
  execute(_ctx, params) {
    if (params.options.length < 2) {
      return {
        error:
          'Questions must have at least 2 options. Either add more options or rephrase as a yes/no question.',
      }
    }
    return params
  },
  mockParams: () => ({
    question: 'Which style do you prefer for the hero section?',
    options: [
      { value: 'minimal', label: 'Minimal' },
      { value: 'bold', label: 'Bold' },
      { value: 'classic', label: 'Classic' },
    ],
    multiSelect: false,
  }),
  mockParamsVariants: () => [
    {
      question:
        'Which of the following sections should be included on the page?',
      options: [
        { value: 'hero', label: 'Hero' },
        { value: 'features', label: 'Features' },
        { value: 'testimonials', label: 'Testimonials' },
        { value: 'pricing', label: 'Pricing' },
      ],
      multiSelect: true,
    },
  ],
})
