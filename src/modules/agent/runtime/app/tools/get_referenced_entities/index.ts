import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { stringArrayParam } from '../schemas'

const paramsSchema = z.object({
  uuids: stringArrayParam(
    'Paragraph UUIDs to resolve references for. Returns the entities ' +
      '(media, nodes, taxonomy terms, ...) currently referenced by these ' +
      'paragraphs via any of their reference fields.',
  ),
})

const resultSchema = z.object({
  entities: z.array(
    z.object({
      entityUuid: z
        .string()
        .describe(
          'UUID of the referenced entity. Pass this as `mediaId` to ' +
            'replace_media_field when the entityType is "media".',
        ),
      entityType: z.string().describe('e.g. "media", "node", "taxonomy_term"'),
      entityBundle: z
        .string()
        .describe(
          'e.g. "image", "canto". Pass this as `mediaBundle` to ' +
            'replace_media_field when the entityType is "media".',
        ),
      label: z.string().describe('Human-readable label of the entity'),
      editUrl: z.string().describe('Backend edit URL of the entity'),
      referencedBy: z
        .array(z.string())
        .describe(
          'Paragraph UUIDs (from the input) that reference this entity',
        ),
    }),
  ),
})

export default defineBlokkliAgentTool({
  name: 'get_referenced_entities',
  description:
    'Resolve which entities (media items, referenced nodes, taxonomy ' +
    'terms, etc.) are currently referenced by one or more paragraphs. Use ' +
    'this when get_content_fields shows a paragraph has a reference field ' +
    'but you need the actual referenced entity ID — for example, to copy a ' +
    'media reference from one paragraph into another field via ' +
    'replace_media_field.',
  category: 'query',
  lazy: false,
  volatile: true,
  prunedSummary: (r) => `${r.entities?.length ?? 0} referenced entities`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  requiredAdapterMethods: ['getReferencedEntities'],
  label($t) {
    return $t('aiAgentGetReferencedEntitiesRunning', 'Resolving references', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const { $t } = ctx.app
    const raw = await ctx.adapter.getReferencedEntities(params.uuids)
    const result = {
      entities: raw.map((e) => ({
        entityUuid: e.entityUuid,
        entityType: e.entityType,
        entityBundle: e.entityBundle,
        label: e.label,
        editUrl: e.editUrl,
        referencedBy: e.uuids,
      })),
    }
    const label = $t(
      'aiAgentGetReferencedEntitiesDone',
      'Resolved @count referenced entities',
    ).replace('@count', String(result.entities.length))
    return { label, result, affectedUuids: params.uuids }
  },
})
