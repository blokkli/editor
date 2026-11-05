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
import { escapeHtml } from '#blokkli/editor/helpers/string'

// Descriptions are HTML, axe's texts are text: its help names elements
// ("<dl> elements must…"), and its summaries quote the page's values.
function mapAxeNode(node: NodeResult): AnalyzeNode {
  return {
    description: node.failureSummary
      ? escapeHtml(node.failureSummary)
      : undefined,
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
    description: escapeHtml(result.help),
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

/**
 * A locale as axe reads it. Its type leaves out the failure summaries: the
 * text above a node's failing checks.
 */
type AxeLocale = Locale & {
  failureSummaries?: Record<
    string,
    { failureMessage: string | ((messages: string[]) => string) }
  >
}

/**
 * The template of a locale's failure summary: the heading, then each message
 * indented. axe compiles templates with `new Function`, which a strict
 * Content-Security-Policy blocks (axe.configure then throws).
 */
const FAILURE_SUMMARY =
  /^([^{]*)\{\{~it:value\}\}\n {2}\{\{=value\.split\('\\n'\)\.join\('\\n {2}'\)\}\}\{\{~\}\}$/

/**
 * Passes the failure summaries as functions, which axe takes as they are. A
 * summary of another shape is left out: axe then uses its English one.
 */
export function withoutTemplates(locale: AxeLocale): AxeLocale {
  const failureSummaries: NonNullable<AxeLocale['failureSummaries']> = {}
  for (const [key, summary] of Object.entries(locale.failureSummaries ?? {})) {
    const template = summary.failureMessage
    const heading =
      typeof template === 'string' ? template.match(FAILURE_SUMMARY)?.[1] : null
    if (typeof heading === 'string') {
      failureSummaries[key] = {
        failureMessage: (messages) =>
          heading +
          messages.map((m) => '\n  ' + m.split('\n').join('\n  ')).join(''),
      }
    }
  }
  return { ...locale, failureSummaries }
}

async function getLocale(langcode: string): Promise<AxeLocale | null> {
  if (langcode === 'de') {
    const de = await import('axe-core/locales/de.json')
    return withoutTemplates(de.default as unknown as AxeLocale)
  } else if (langcode === 'fr') {
    const fr = await import('axe-core/locales/fr.json')
    return withoutTemplates(fr.default as unknown as AxeLocale)
  } else if (langcode === 'it') {
    const it = await import('axe-core/locales/it.json')
    return withoutTemplates(it.default as unknown as AxeLocale)
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
    run: async function (ctx) {
      if (!axe) {
        const axeModule = await import('axe-core')
        axe = axeModule.default as typeof import('axe-core')

        const locale = (await getLocale(ctx.langcode)) ?? {}
        axe.configure({
          locale,
        })
      }

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
