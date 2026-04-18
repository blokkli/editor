import { defineAnalyzer } from '#blokkli/analyzer'
import type { AnalyzeResult } from '#blokkli/analyzer/types'
import { hashString } from '#blokkli/analyzer/helpers/hashString'

export default defineAnalyzer(() => {
  return {
    id: 'blokkli:image-alt-text',
    label: (_langcode, $t) => $t('analyzeAltTextLabel', 'Image Alt Texts'),
    continuous: true,
    run: async (context) => {
      const $t = context.$t
      const images = [
        ...context.providerRootElement.querySelectorAll('img'),
      ].map((img) => {
        const alt = img.getAttribute('alt')
        return {
          element: img,
          hasAlt: alt !== null && alt.trim() !== '',
          alt: alt || '',
          src: img.src.substring(0, 50),
        }
      })

      const withAlt = images.filter((v) => v.hasAlt)
      const withoutAlt = images.filter((v) => !v.hasAlt)

      const results: AnalyzeResult[] = []

      // Always show images with alt text result
      results.push({
        id: 'blokkli:image-alt-text:valid',
        title: $t('analyzeAltTextValid', 'Images with alt text'),
        category: 'accessibility' as const,
        description: $t(
          'analyzeAltTextValidDescription',
          'Images have an alt text.',
        ),
        status: 'pass' as const,
        nodes: withAlt.map((img) => ({
          targets: img.element,
        })),
      })

      // Only show missing alt text result if there are any
      if (withoutAlt.length > 0) {
        results.push({
          id: 'blokkli:image-alt-text:missing',
          title: $t('analyzeAltTextMissing', 'Images without alt text'),
          category: 'accessibility' as const,
          description: $t(
            'analyzeAltTextMissingDescription',
            'Images are missing alt text. Alt texts are important for accessibility and SEO.',
          ),
          status: 'violation' as const,
          impact: 'serious' as const,
          nodes: withoutAlt.map((img) => ({
            description: $t(
              'analyzeAltTextMissingNode',
              'Image without alt text',
            ),
            impact: 'serious' as const,
            identifier: hashString(img.src),
            targets: img.element,
          })),
        })
      }

      return results
    },
  }
})
