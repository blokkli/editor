import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const nodeSchema = z.object({
  description: z.string().optional(),
  impact: z.string().optional(),
  scores: z.record(z.string(), z.number()).optional(),
  blockUuid: z.string().optional(),
  textIndex: z.number().optional(),
})

const analyzeResultSchema = z.object({
  analyzerId: z.string(),
  analyzerLabel: z.string().optional(),
  id: z.string(),
  title: z.string(),
  category: z.string(),
  status: z.string(),
  description: z.string(),
  impact: z.string().optional(),
  nodes: z.array(nodeSchema),
})

const textResultSchema = z.object({
  text: z.string(),
  analyzerId: z.string(),
  analyzerLabel: z.string().optional(),
  nodes: z.array(
    z.object({
      description: z.string().optional(),
      impact: z.string().optional(),
      scores: z.record(z.string(), z.number()).optional(),
    }),
  ),
})

const paramsSchema = z.object({
  uuids: z
    .array(z.string())
    .optional()
    .describe(
      'Block UUIDs to analyze. Runs all available analyzers against the DOM subtree of each block.',
    ),
  texts: z
    .array(z.string())
    .optional()
    .describe(
      'Raw text strings to analyze directly. Useful for testing rewrites before applying them.',
    ),
  analyzerIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of analyzer IDs to run. If omitted, all analyzers run.',
    ),
})

const resultSchema = z.object({
  results: z.array(analyzeResultSchema),
  textResults: z.array(textResultSchema).optional(),
})

export default defineBlokkliAgentTool({
  name: 'analyze_content',
  description:
    'Run content analyzers (readability, accessibility, SEO, etc.) on specific blocks by UUID, on raw text strings, or on the entire page. Use the texts parameter to test a rewrite before applying it. When called without any parameters, runs all analyzers against the full page.',
  category: 'query',
  volatile: true,
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  requiredAdapterMethods: ['getAnalyzers'],
  label($t) {
    return $t('aiAgentAnalyzeContentRunning', 'Analyzing content...')
  },
  prunedSummary: (r) => {
    const count = r.results.length + (r.textResults?.length ?? 0)
    return `analyzed ${count} results`
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const { blocks, dom, context, analyze, ui, $t } = ctx.app

    await analyze.ensureInitialized()

    // Filter out analyzers that require the raw page (e.g. axe-core).
    let availableAnalyzers = analyze.analyzers.value.filter(
      (a) => !a.requireRawPage,
    )

    // Apply analyzer ID filter if provided.
    if (params.analyzerIds?.length) {
      const ids = new Set(params.analyzerIds)
      availableAnalyzers = availableAnalyzers.filter((a) => ids.has(a.id))
    }

    const results: z.infer<typeof analyzeResultSchema>[] = []
    const textResults: z.infer<typeof textResultSchema>[] = []

    if (params.uuids?.length) {
      // UUID mode: run analyzers against block DOM subtrees.
      for (const uuid of params.uuids) {
        const block = blocks.getBlock(uuid)
        if (!block) continue

        const el = dom.getDragElement(block)
        if (!el) continue

        const analyzerCtx = analyze.createContext(el)

        for (const analyzer of availableAnalyzers) {
          const rawResults = await analyze.runAnalyzer(analyzer, analyzerCtx)

          for (const result of rawResults) {
            const rawNodes = Array.isArray(result.nodes)
              ? result.nodes
              : [result.nodes]

            const mappedNodes: z.infer<typeof nodeSchema>[] = []
            for (const node of rawNodes) {
              // Resolve HTMLElement targets to the closest block UUID.
              let blockUuid: string | undefined
              const targets = Array.isArray(node.targets)
                ? node.targets
                : [node.targets]
              for (const target of targets) {
                if (target instanceof HTMLElement) {
                  const closest = target.closest('[data-bk-uuid]')
                  if (closest) {
                    blockUuid =
                      closest.getAttribute('data-bk-uuid') ?? undefined
                    break
                  }
                } else if (typeof target === 'object' && 'uuid' in target) {
                  blockUuid = target.uuid
                  break
                }
              }

              mappedNodes.push({
                description: node.description,
                impact: node.impact,
                scores: node.scores,
                blockUuid: blockUuid ?? uuid,
              })
            }

            const label =
              typeof analyzer.label === 'function'
                ? analyzer.label(context.value.language)
                : analyzer.label

            results.push({
              analyzerId: analyzer.id,
              analyzerLabel: label,
              id: result.id,
              title: result.title,
              category: result.category,
              status: result.status,
              description: result.description,
              impact: result.impact,
              nodes: mappedNodes,
            })
          }
        }
      }
    } else if (!params.texts?.length) {
      // Full page scan: run analyzers against the entire provider element.
      const analyzerCtx = analyze.createContext(ui.providerElement)

      for (const analyzer of availableAnalyzers) {
        const rawResults = await analyze.runAnalyzer(analyzer, analyzerCtx)

        for (const result of rawResults) {
          const rawNodes = Array.isArray(result.nodes)
            ? result.nodes
            : [result.nodes]

          const mappedNodes: z.infer<typeof nodeSchema>[] = []
          for (const node of rawNodes) {
            let blockUuid: string | undefined
            const targets = Array.isArray(node.targets)
              ? node.targets
              : [node.targets]
            for (const target of targets) {
              if (target instanceof HTMLElement) {
                const closest = target.closest('[data-bk-uuid]')
                if (closest) {
                  blockUuid =
                    closest.getAttribute('data-bk-uuid') ?? undefined
                  break
                }
              } else if (typeof target === 'object' && 'uuid' in target) {
                blockUuid = target.uuid
                break
              }
            }

            mappedNodes.push({
              description: node.description,
              impact: node.impact,
              scores: node.scores,
              blockUuid,
            })
          }

          const label =
            typeof analyzer.label === 'function'
              ? analyzer.label(context.value.language)
              : analyzer.label

          results.push({
            analyzerId: analyzer.id,
            analyzerLabel: label,
            id: result.id,
            title: result.title,
            category: result.category,
            status: result.status,
            description: result.description,
            impact: result.impact,
            nodes: mappedNodes,
          })
        }
      }
    }

    // Text mode: run analyzeText on analyzers that support it.
    if (params.texts?.length) {
      const rawTextResults = await analyze.runOnTexts(
        params.texts,
        params.analyzerIds,
      )

      for (const tr of rawTextResults) {
        textResults.push({
          text: tr.text,
          analyzerId: tr.analyzerId,
          analyzerLabel: tr.analyzerLabel,
          nodes: tr.nodes.map((node) => ({
            description: node.description,
            impact: node.impact,
            scores: node.scores,
          })),
        })
      }
    }

    const totalCount = results.length + textResults.length

    return {
      label: $t('aiAgentAnalyzeContentDone', 'Analyzed @count results').replace(
        '@count',
        String(totalCount),
      ),
      result: {
        results,
        textResults: textResults.length ? textResults : undefined,
      },
    }
  },
})
