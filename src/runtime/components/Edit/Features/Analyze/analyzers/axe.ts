import { defineAnalyzer } from './defineAnalyzer'
import axe, {
  type Result,
  type NodeResult,
  type Locale,
  type ContextObject,
  type RunOptions,
} from 'axe-core'
import type { AnalyzeNode, AnalyzeResult, AnalyzeStatus } from './types'
import { falsy } from '#blokkli/helpers'
import de from 'axe-core/locales/de.json'
import fr from 'axe-core/locales/fr.json'
import it from 'axe-core/locales/it.json'

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

function getLocale(langcode: string): Locale | null {
  if (langcode === 'de') {
    return de as unknown as Locale
  } else if (langcode === 'fr') {
    return fr as unknown as Locale
  } else if (langcode === 'it') {
    return it as unknown as Locale
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

  return {
    id: 'axe',
    init: function (context) {
      const locale = getLocale(context.interfaceLangcode) ?? {}
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
