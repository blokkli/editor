import { useBlokkli } from '#imports'
import type { AnalyzeCategory } from './types'

export function useAnalyzeHelper() {
  const { $t } = useBlokkli()

  function getCategoryLabel(category: AnalyzeCategory): string {
    if (category === 'accessibility') {
      return $t('analyzeCategoryAccessibility', 'Accessibility')
    } else if (category === 'seo') {
      return $t('analyzeCategorySeo', 'SEO')
    }

    return $t('analyzeCategoryText', 'Content')
  }

  return {
    getCategoryLabel,
  }
}
