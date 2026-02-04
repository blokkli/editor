import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  message: z.string().optional().describe('Optional message to echo back'),
})

const resultSchema = z.object({
  success: z.boolean().describe('Whether the ping was successful'),
  message: z.string().describe('Response message'),
  timestamp: z.number().describe('Unix timestamp of the response'),
})

export default defineBlokkliAgentTool({
  name: 'ping',
  description:
    'A simple test tool that returns a success response. Use this to verify the agent is working.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: () => 'Pinging...',
  paramsSchema,
  resultSchema,
  execute: (_ctx, params) => {
    return {
      label: 'Pong!',
      result: {
        success: true,
        message: params.message ? `Pong: ${params.message}` : 'Pong!',
        timestamp: Date.now(),
      },
    }
  },
})
