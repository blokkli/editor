import type { AnalyzeResult } from '#blokkli/analyzer/types'
import { falsy } from '#blokkli/helpers'
import { defineAnalyzer } from './defineAnalyzer'
import { hashString } from './helpers/hashString'

/**
 * Class on the provider root element that disables this analyzer for the
 * whole page.
 */
const SKIP_PAGE_CLASS = 'bk-skip-heading-structure'

/**
 * Headings inside an element with this class are not analyzed. Same
 * convention as the text analyzers (see collectTextElements).
 */
const SKIP_ELEMENT_CLASS = 'bk-skip-analyze'

/**
 * The level the first heading of the page is compared against. A page is
 * expected to start with an H1 (or at most an H2), so a first heading of H3
 * or lower is reported as a skipped level.
 */
const ROOT_LEVEL = 1

type Heading = {
  element: HTMLElement
  level: number
  text: string
}

export default defineAnalyzer(() => {
  return {
    id: 'blokkli:heading-structure',
    label: (_langcode, $t) =>
      $t('analyzeHeadingStructureLabel', 'Heading Structure'),
    continuous: true,
    run: async (context) => {
      const $t = context.$t
      const root = context.providerRootElement
      const results: AnalyzeResult[] = []

      if (root.classList.contains(SKIP_PAGE_CLASS)) {
        return []
      }

      // Get all headings in document order
      const allHeadings: Heading[] = [
        ...root.querySelectorAll('h1, h2, h3, h4, h5, h6'),
      ]
        .map((heading) => {
          if (
            heading instanceof HTMLElement &&
            !heading.closest('.' + SKIP_ELEMENT_CLASS)
          ) {
            const level = parseInt(heading.tagName.substring(1))
            return {
              element: heading,
              level,
              text: heading.textContent?.trim() || '',
            }
          }
        })
        .filter(falsy)

      // Check H1 count. Both violations are page-level findings and carry no
      // identifier: ignoring a single heading would not change the count.
      const h1Elements = allHeadings.filter((h) => h.level === 1)
      if (h1Elements.length > 1) {
        results.push({
          id: 'blokkli:heading-structure:multiple-h1',
          title: $t('analyzeHeadingMultipleH1', 'Multiple H1 headings'),
          category: 'seo' as const,
          description: $t(
            'analyzeHeadingMultipleH1Description',
            'The page contains @count H1 headings. There should only be one H1 heading per page.',
          ).replace('@count', String(h1Elements.length)),
          status: 'violation' as const,
          impact: 'serious' as const,
          nodes: h1Elements.map((h) => ({
            description: h.text,
            targets: h.element,
          })),
        })
      } else if (h1Elements.length === 0) {
        results.push({
          id: 'blokkli:heading-structure:missing-h1',
          title: $t('analyzeHeadingMissingH1', 'Missing H1 heading'),
          category: 'seo' as const,
          description: $t(
            'analyzeHeadingMissingH1Description',
            'The page contains no H1 heading. Every page should have exactly one H1 heading.',
          ),
          status: 'violation' as const,
          impact: 'serious' as const,
          nodes: {
            description: $t('analyzeHeadingNoH1Found', 'No H1 heading found'),
            targets: root,
          },
        })
      }

      // Check heading order (no skipped levels). The first heading is compared
      // against the root level so a page starting at H3 is also reported.
      const orderIssues: Array<{
        current: Heading
        previous: Heading | undefined
      }> = []

      for (let i = 0; i < allHeadings.length; i++) {
        const previous = allHeadings[i - 1]
        const current = allHeadings[i]
        if (!current) {
          continue
        }

        const previousLevel = previous ? previous.level : ROOT_LEVEL
        if (current.level > previousLevel + 1) {
          orderIssues.push({ current, previous })
        }
      }

      if (orderIssues.length > 0) {
        results.push({
          id: 'blokkli:heading-structure:skipped-levels',
          title: $t('analyzeHeadingSkippedLevels', 'Skipped heading levels'),
          category: 'seo' as const,
          description:
            orderIssues.length === 1
              ? $t(
                  'analyzeHeadingSkippedLevelsDescriptionOne',
                  'One heading skips a level. The heading hierarchy should not skip levels (e.g. do not jump from H2 to H4).',
                )
              : $t(
                  'analyzeHeadingSkippedLevelsDescription',
                  '@count headings skip a level. The heading hierarchy should not skip levels (e.g. do not jump from H2 to H4).',
                ).replace('@count', String(orderIssues.length)),
          status: 'violation' as const,
          impact: 'moderate' as const,
          nodes: orderIssues.map(({ current, previous }) => {
            const tag = current.element.tagName
            const previousLevel = previous ? previous.level : ROOT_LEVEL
            return {
              description: previous
                ? `${previous.element.tagName} → ${tag}: "${current.text}"`
                : $t(
                    'analyzeHeadingSkippedLevelsFirst',
                    'First heading is @tag: "@text"',
                  )
                    .replace('@tag', tag)
                    .replace('@text', current.text),
              impact: 'moderate' as const,
              identifier: hashString(
                previousLevel + '>' + current.level + ':' + current.text,
              ),
              targets: current.element,
            }
          }),
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
            targets: root,
          },
        })
      }

      // Only report a pass when the whole structure is correct.
      if (
        h1Elements.length === 1 &&
        orderIssues.length === 0 &&
        h2Elements.length > 0
      ) {
        results.push({
          id: 'blokkli:heading-structure:valid',
          title: $t('analyzeHeadingValid', 'Correct heading structure'),
          category: 'seo' as const,
          description:
            h2Elements.length === 1
              ? $t(
                  'analyzeHeadingValidDescriptionOne',
                  'The page has a correct heading structure: one H1, one H2 heading, no skipped levels.',
                )
              : $t(
                  'analyzeHeadingValidDescription',
                  'The page has a correct heading structure: one H1, @count H2 headings, no skipped levels.',
                ).replace('@count', String(h2Elements.length)),
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
