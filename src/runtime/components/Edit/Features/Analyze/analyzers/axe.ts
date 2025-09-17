import { defineAnalyzer } from '.'
import axe, { type Result, type NodeResult, type Locale } from 'axe-core'
import type { AnalyzeNode, AnalyzeResult, AnalyzeStatus } from './../types'
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
    plugin: 'axe',
    id: result.id,
    title: result.description,
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
    return {
      lang: 'de',
      rules: de.rules,
      checks: de.checks as any,
    }
  } else if (langcode === 'fr') {
    return {
      lang: 'fr',
      rules: fr.rules,
      checks: fr.checks as any,
    }
  } else if (langcode === 'it') {
    return {
      lang: 'it',
      rules: it.rules,
      checks: it.checks as any,
    }
  }

  return null
}

export default defineAnalyzer(() => {
  return {
    id: 'axe',
    category: 'accessibility',
    run: function (context) {
      const locale = getLocale(context.langcode) ?? {}
      axe.configure({
        locale,
      })
      return axe
        .run({
          exclude: [
            '#nuxt-devtools-container',
            '.bk',
            '.bk-sidebar',
            '#bk-animation-canvas-webgl',
          ],
        })
        .then((result) => {
          return [
            ...mapAxeResults(result.incomplete, 'incomplete'),
            ...mapAxeResults(result.inapplicable, 'inapplicable'),
            ...mapAxeResults(result.passes, 'pass'),
            ...mapAxeResults(result.violations, 'violation'),
          ]
        })
    },
  }
})
