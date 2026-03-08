import { defineAnalyzer } from '#blokkli/analyzer'
import type { AnalyzeResult } from '#blokkli/analyzer/types'
import { falsy } from '#blokkli/helpers'

export default defineAnalyzer(() => {
  return {
    id: 'blokkli:heading-structure',
    label: (_langcode, $t) =>
      $t('analyzeHeadingStructureLabel', 'Heading Structure'),
    continuous: true,
    run: async (context) => {
      const $t = context.$t
      const results: AnalyzeResult[] = []

      // Get all headings in document order
      const allHeadings = [
        ...context.providerRootElement.querySelectorAll(
          'h1, h2, h3, h4, h5, h6',
        ),
      ]
        .map((heading) => {
          if (heading instanceof HTMLElement) {
            const level = parseInt(heading.tagName.substring(1))
            return {
              element: heading,
              level,
              text: heading.textContent?.trim() || '',
            }
          }
        })
        .filter(falsy)

      const h1Elements = allHeadings.filter((h) => h.level === 1)
      if (h1Elements.length > 1) {
        results.push({
          id: 'blokkli:heading-structure:multiple-h1',
          title: $t('analyzeHeadingMultipleH1', 'Multiple H1 headings'),
          category: 'seo' as const,
          description: $t(
            'analyzeHeadingMultipleH1Description',
            'The page contains multiple H1 headings. There should only be one H1 heading per page.',
          ),
          status: 'violation' as const,
          impact: 'serious' as const,
          nodes: h1Elements.map((h) => ({
            description: h.text,
            targets: h.element,
          })),
        })
      }

      // Check heading order (no skipped levels)
      const orderIssues: Array<{
        current: (typeof allHeadings)[0]
        previous: (typeof allHeadings)[0]
      }> = []

      for (let i = 1; i < allHeadings.length; i++) {
        const previous = allHeadings[i - 1]
        const current = allHeadings[i]
        if (!previous || !current) {
          continue
        }

        // Check if we're skipping levels (going down more than 1 level)
        if (current.level > previous.level + 1) {
          orderIssues.push({ current, previous })
        }
      }

      if (orderIssues.length > 0) {
        results.push({
          id: 'blokkli:heading-structure:skipped-levels',
          title: $t('analyzeHeadingSkippedLevels', 'Skipped heading levels'),
          category: 'seo' as const,
          description: $t(
            'analyzeHeadingSkippedLevelsDescription',
            'Headings skip a level. The heading hierarchy should not skip levels (e.g. do not jump from H2 to H4).',
          ),
          status: 'violation' as const,
          impact: 'moderate' as const,
          nodes: orderIssues.map(({ current, previous }) => ({
            description: `${previous.element.tagName} → ${current.element.tagName}: "${current.text}"`,
            impact: 'moderate' as const,
            targets: current.element,
          })),
        })
      }

      // Check for H2s
      const h2Elements = allHeadings.filter((h) => h.level === 2)

      if (h2Elements.length === 0) {
        results.push({
          id: 'blokkli:heading-structure:no-h2',
          title: $t('analyzeHeadingNoH2', 'Missing H2 headings'),
          category: 'seo' as const,
          description: $t(
            'analyzeHeadingNoH2Description',
            'The page contains no H2 headings. A clear heading structure is important for SEO and accessibility.',
          ),
          status: 'violation' as const,
          impact: 'moderate' as const,
          nodes: {
            description: $t('analyzeHeadingNoH2Found', 'No H2 headings found'),
            targets: context.providerRootElement,
          },
        })
      }

      // If everything is good, show success
      if (
        h1Elements.length === 1 &&
        orderIssues.length === 0 &&
        h2Elements.length > 0
      ) {
        results.push({
          id: 'blokkli:heading-structure:valid',
          title: $t('analyzeHeadingValid', 'Correct heading structure'),
          category: 'seo' as const,
          description: $t(
            'analyzeHeadingValidDescription',
            'The page has a correct heading structure with no skipped levels.',
          ),
          status: 'pass' as const,
          nodes: allHeadings.map((h) => ({
            description: `${h.element.tagName}: ${h.text}`,
            targets: h.element,
          })),
        })
      }

      return results
    },
  }
})
