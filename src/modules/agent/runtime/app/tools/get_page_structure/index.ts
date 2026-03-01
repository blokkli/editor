import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  buildPageStructure,
  buildBlock,
  countBlocks,
} from '#blokkli/agent/app/helpers/pageStructure'
import type { PageStructureBlock } from '#blokkli/agent/shared/types'

const paramsSchema = z.object({
  uuid: z
    .string()
    .optional()
    .describe(
      'UUID of a specific paragraph. When provided, returns only that paragraph and its subtree. Omit to get the full page structure.',
    ),
})

const resultSchema = z.object({
  totalParagraphs: z
    .number()
    .describe(
      'Total number of paragraphs in scope (full page or subtree when uuid is given)',
    ),
  structure: z
    .string()
    .describe('The page structure as an XML tree of paragraphs and fields'),
})

// ---------------------------------------------------------------------------
// XML formatting helpers
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatBlock(block: PageStructureBlock, indent: string): string {
  const hasContent = block.contentFields || block.fields
  if (!hasContent) {
    return `${indent}<Paragraph uuid="${block.uuid}" bundle="${escapeXml(block.bundle)}" />`
  }

  const lines: string[] = []
  lines.push(
    `${indent}<Paragraph uuid="${block.uuid}" bundle="${escapeXml(block.bundle)}">`,
  )

  if (block.contentFields) {
    for (const [name, value] of Object.entries(block.contentFields)) {
      lines.push(
        `${indent}  <ContentField name="${escapeXml(name)}">${escapeXml(value)}</ContentField>`,
      )
    }
  }

  if (block.fields) {
    for (const [fieldName, children] of Object.entries(block.fields)) {
      lines.push(`${indent}  <ParagraphField name="${escapeXml(fieldName)}">`)
      for (const child of children) {
        lines.push(formatBlock(child, indent + '    '))
      }
      lines.push(`${indent}  </ParagraphField>`)
    }
  }

  lines.push(`${indent}</Paragraph>`)
  return lines.join('\n')
}

export default defineBlokkliAgentTool({
  name: 'get_page_structure',
  description:
    'Get page structure as an XML tree of paragraphs, their fields, and content previews. Without a UUID, returns the full page. With a UUID, returns that paragraph and its subtree.',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => `page structure (${r.totalParagraphs ?? 0} paragraphs)`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetPageStructureRunning', 'Getting page structure...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    if (params.uuid) {
      const block = ctx.app.blocks.getBlock(params.uuid)
      if (!block) {
        return { error: `Paragraph with UUID "${params.uuid}" not found.` }
      }
      const paragraph = buildBlock(ctx.app, params.uuid, block.bundle)
      const total = countBlocks(paragraph)
      return {
        label: ctx.app
          .$t(
            'aiAgentGetPageStructureDone',
            'Got page structure (@count paragraphs)',
          )
          .replace('@count', String(total)),
        result: {
          totalParagraphs: total,
          structure: formatBlock(paragraph, ''),
        },
      }
    }

    const pageContext = ctx.app.context.value
    const ps = buildPageStructure(ctx.app)

    const lines: string[] = []
    lines.push(
      `<Page uuid="${pageContext.entityUuid}" type="${escapeXml(pageContext.entityType)}" bundle="${escapeXml(pageContext.entityBundle)}">`,
    )

    if (ps.entityContentFields) {
      for (const [name, value] of Object.entries(ps.entityContentFields)) {
        lines.push(
          `  <ContentField name="${escapeXml(name)}">${escapeXml(value)}</ContentField>`,
        )
      }
    }

    for (const [fieldName, blocks] of Object.entries(ps.fields)) {
      lines.push(`  <ParagraphField name="${escapeXml(fieldName)}">`)
      for (const block of blocks) {
        lines.push(formatBlock(block, '    '))
      }
      lines.push(`  </ParagraphField>`)
    }

    lines.push(`</Page>`)

    return {
      label: ctx.app
        .$t(
          'aiAgentGetPageStructureDone',
          'Got page structure (@count paragraphs)',
        )
        .replace('@count', String(ps.totalParagraphs)),
      result: {
        totalParagraphs: ps.totalParagraphs,
        structure: lines.join('\n'),
      },
    }
  },
})
