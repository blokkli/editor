import { defineAnalyzer } from './defineAnalyzer'
import type {
  Result,
  NodeResult,
  Locale,
  ContextObject,
  RunOptions,
} from 'axe-core'
import type { AnalyzeNode, AnalyzeResult, AnalyzeStatus } from './types'
import { falsy } from '#blokkli/helpers'

function mapAxeNode(node: NodeResult): AnalyzeNode {
  return {
    description: node.failureSummary,
    impact: node.impact ?? undefined,
    targets: node.target
      .map((v) => {
        if (Array.isArray(v)) {
          return null
        }
        return v
      })
      .filter(falsy),
  }
}

function mapAxeResult(result: Result, status: AnalyzeStatus): AnalyzeResult {
  return {
    id: result.id,
    title: result.description,
    category: 'accessibility',
    description: result.help,
    link: result.helpUrl,
    status,
    impact: result.impact ?? undefined,
    nodes: result.nodes.map(mapAxeNode),
  }
}

function mapAxeResults(
  results: Result[],
  status: AnalyzeStatus,
): AnalyzeResult[] {
  return results.map((v) => mapAxeResult(v, status))
}

async function getLocale(langcode: string): Promise<Locale | null> {
  if (langcode === 'de') {
    const de = await import('axe-core/locales/de.json')
    return de.default as unknown as Locale
  } else if (langcode === 'fr') {
    const fr = await import('axe-core/locales/fr.json')
    return fr.default as unknown as Locale
  } else if (langcode === 'it') {
    const it = await import('axe-core/locales/it.json')
    return it.default as unknown as Locale
  }

  return null
}

export default defineAnalyzer<{
  /**
   * Selectors to exclude.
   */
  exclude?: string[]

  /**
   * Run options passed to axe-core.
   */
  runOptions?: RunOptions
}>((options) => {
  const userExclude = options?.exclude ?? []
  const elementContext: ContextObject = {
    exclude: [
      '#nuxt-devtools-container',
      '.bk',
      '.bk-sidebar',
      '#bk-animation-canvas-webgl',
      ...userExclude,
    ],
  }

  let axe: typeof import('axe-core')

  return {
    id: 'axe',
    label: 'Axe (Accessibility Check)',
    requireRawPage: true,
    init: async function (context) {
      const axeModule = await import('axe-core')
      axe = axeModule.default as typeof import('axe-core')

      const locale = (await getLocale(context.interfaceLangcode)) ?? {}
      axe.configure({
        locale,
      })
    },
    run: function () {
      return axe
        .run(elementContext, options?.runOptions ?? {})
        .then((result) => {
          return [
            ...mapAxeResults(result.incomplete, 'incomplete'),
            ...mapAxeResults(result.inapplicable, 'inapplicable'),
            ...mapAxeResults(result.passes, 'pass'),
            ...mapAxeResults(result.violations, 'violation'),
          ] satisfies AnalyzeResult[]
        })
    },
  }
})
