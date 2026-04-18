import { defineAnalyzer } from './defineAnalyzer'
import type { AnalyzeImpact, AnalyzeNode, AnalyzeResult } from './types'
import { collectTextElements } from './helpers/collectTextElements'
import { hashString } from './helpers/hashString'
import type { TextProvider } from '#blokkli/editor/providers/texts'
import type { ReadabilityProvider } from '#blokkli/editor/providers/readability'

function summarizeImpact(nodes: AnalyzeNode[]): AnalyzeImpact | undefined {
  const order: AnalyzeImpact[] = ['minor', 'moderate', 'serious', 'critical']
  let maxIdx = -1
  for (const n of nodes) {
    if (!n.impact) continue
    const i = order.indexOf(n.impact)
    if (i > maxIdx) maxIdx = i
  }
  return maxIdx >= 0 ? order[maxIdx] : undefined
}

function buildDescription(
  lang: string,
  band: 'ok' | 'hard',
  $t: TextProvider,
): string {
  const parts: string[] = []
  if (band === 'hard') {
    parts.push(
      $t('analyzerReadabiliyHardToRead', `Hard to read (@lang).`).replace(
        '@lang',
        lang.toUpperCase(),
      ),
    )
  } else {
    parts.push(
      $t(
        'analyzerReadabiliyCouldBeSimpler',
        `Could be simpler (@lang).`,
      ).replace('@lang', lang.toUpperCase()),
    )
  }
  parts.push(
    $t(
      'analyzerReadabiliyShorterSentences',
      `Consider shorter sentences and simpler wording.`,
    ),
  )
  return parts.join(' · ')
}

/**
 * Thin wrapper that delegates scoring to the readability provider and maps
 * results to AnalyzeResult/AnalyzeNode for the analyze sidebar UI.
 *
 * DOM elements for highlighting are resolved per-field via the directive
 * system to ensure they target the actual block, not duplicates (e.g. table
 * of contents).
 */
async function analyzeViaProvider(
  readabilityProvider: ReadabilityProvider,
  langcode: string,
  $t: TextProvider,
): Promise<AnalyzeResult[]> {
  const result = await readabilityProvider.analyzeAllFields()
  const scoreLabel = readabilityProvider.scoreLabel.value
  const hardNodes: AnalyzeNode[] = []
  const okNodes: AnalyzeNode[] = []

  for (const [key, fieldResult] of Object.entries(result)) {
    const separatorIndex = key.indexOf('/')
    const uuid = key.slice(0, separatorIndex)
    const fieldName = key.slice(separatorIndex + 1)

    // Find the actual editable field element in the DOM.
    const fieldElement = readabilityProvider.getFieldElement(uuid, fieldName)

    // Collect text elements scoped to this field's DOM subtree.
    const fieldTextElements = fieldElement
      ? collectTextElements(fieldElement)
      : []

    for (let i = 0; i < fieldResult.chunks.length; i++) {
      const chunk = fieldResult.chunks[i]!
      if (
        chunk.band === 'easy' ||
        chunk.band === null ||
        chunk.score === null ||
        chunk.impact === null
      )
        continue

      // Match chunk to its DOM element by position index within the field.
      const targets: HTMLElement[] = []
      const textElement = fieldTextElements[i]
      if (textElement) {
        targets.push(textElement.element)
      }

      const node: AnalyzeNode = {
        description: buildDescription(langcode, chunk.band, $t),
        impact: chunk.impact,
        score: chunk.score,
        scoreLabel,
        uuid,
        identifier: hashString(chunk.text),
        targets,
      }

      if (chunk.band === 'hard') {
        hardNodes.push(node)
      } else {
        okNodes.push(node)
      }
    }
  }

  const results: AnalyzeResult[] = []

  results.push({
    id: 'low-readability',
    title: $t('analyzerReadabiliyTitle', 'Text readability issues'),
    category: 'text',
    description: $t(
      'analyzerReadabiliyDescription',
      'Avoid texts that are hard to read.',
    ),
    link: 'https://en.wikipedia.org/wiki/Readability',
    status: hardNodes.length ? 'violation' : 'pass',
    nodes: hardNodes,
    impact: summarizeImpact(hardNodes),
  })

  if (okNodes.length) {
    results.push({
      id: 'ok-readability',
      title: $t('analyzerReadabiliyOkTitle', 'Text could be simpler'),
      category: 'text',
      description: $t(
        'analyzerReadabiliyOkDescription',
        'Text that could be easier to read.',
      ),
      link: 'https://en.wikipedia.org/wiki/Readability',
      status: 'incomplete',
      nodes: okNodes,
      impact: summarizeImpact(okNodes),
    })
  }

  return results
}

export default defineAnalyzer(() => {
  return {
    id: 'readability',
    type: 'readability',
    label: (langcode) => {
      if (langcode === 'de') {
        return 'Lesbarkeit'
      }
      return 'Readability'
    },
    description:
      'Analyzes text readability using language-specific algorithms. Flags hard-to-read text blocks.',
    continuous: true,
    async init(context) {
      await context.readability.ensureInitialized()
    },
    run(context) {
      return analyzeViaProvider(
        context.readability,
        context.langcode,
        context.$t,
      )
    },
  }
})
