import { useBlokkli } from '#imports'
import type { AnalyzeCategory, AnalyzeStatus } from './analyzers/types'

export function useAnalyzeHelper() {
  const { $t } = useBlokkli()

  function getCategoryLabel(category: AnalyzeCategory): string {
    if (category === 'accessibility') {
      return $t('analyzeCategoryAccessibility', 'Accessibility')
    } else if (category === 'seo') {
      return $t('analyzeCategorySeo', 'SEO')
    } else if (category === 'content') {
      return $t('analyzeCategoryContent', 'Content')
    }

    return $t('analyzeCategoryText', 'Text')
  }

  function getStatusLabel(status: AnalyzeStatus): string {
    if (status === 'pass') {
      return $t('analyzeStatusPass', 'Pass')
    } else if (status === 'incomplete') {
      return $t('analyzeStatusIncomplete', 'Incomplete')
    } else if (status === 'violation') {
      return $t('analyzeStatusViolation', 'Violation')
    }

    return $t('analyzeStatusInapplicable', 'Inapplicable')
  }

  return {
    getCategoryLabel,
    getStatusLabel,
  }
}
