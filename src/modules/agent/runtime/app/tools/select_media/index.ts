import { z } from 'zod'
import { defineBlokkliMcpTool } from '#blokkli/agent/app/composables'
import Component from './Component.vue'

const mediaItemSchema = z.object({
  mediaId: z.string().describe('The unique ID of the media item'),
  label: z.string().describe('The display label/title of the media'),
  mediaBundle: z.string().describe('The media type (e.g., "image", "video")'),
  thumbnail: z.string().optional().describe('URL of the thumbnail image'),
})

const paramsSchema = z.object({
  items: z
    .array(mediaItemSchema)
    .describe('Media items from search_media to display for selection'),
  prompt: z
    .string()
    .optional()
    .describe('Optional message to show the user explaining what to select'),
})

const resultSchema = z.object({
  selected: mediaItemSchema
    .nullable()
    .describe('The selected media item, or null if the user cancelled'),
  label: z
    .string()
    .optional()
    .describe('Human-readable label of the prompt (for UI display)'),
  userMessage: z
    .string()
    .optional()
    .describe('Message to display as user response in conversation'),
})

export type SelectMediaParams = z.infer<typeof paramsSchema>
export type SelectMediaResult = z.infer<typeof resultSchema>
export type SelectMediaItem = z.infer<typeof mediaItemSchema>

export default defineBlokkliMcpTool({
  name: 'select_media',
  description:
    'Show a thumbnail grid of media items for the user to select from. Use this when search_media returns multiple results and you want the user to choose one.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) => $t('aiAgentSelectMediaRunning', 'Selecting media...'),
  paramsSchema,
  resultSchema,
  component: Component,
  execute: (_ctx, params) => params,
  mockParams: () => ({
    items: [
      {
        mediaId: '1',
        label: 'Sunset Beach',
        mediaBundle: 'image',
        thumbnail: 'https://picsum.photos/seed/1/200',
      },
      {
        mediaId: '2',
        label: 'Mountain View',
        mediaBundle: 'image',
        thumbnail: 'https://picsum.photos/seed/2/200',
      },
      {
        mediaId: '3',
        label: 'City Lights',
        mediaBundle: 'image',
        thumbnail: 'https://picsum.photos/seed/3/200',
      },
      {
        mediaId: '4',
        label: 'Forest Path',
        mediaBundle: 'image',
        thumbnail: 'https://picsum.photos/seed/4/200',
      },
      {
        mediaId: '5',
        label: 'Ocean Waves',
        mediaBundle: 'image',
        thumbnail: 'https://picsum.photos/seed/5/200',
      },
      {
        mediaId: '6',
        label: 'Desert Dunes',
        mediaBundle: 'image',
        thumbnail: 'https://picsum.photos/seed/6/200',
      },
    ],
    prompt: 'Select an image for the hero section',
  }),
})
