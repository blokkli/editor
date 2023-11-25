import { inject } from 'vue'
import type { ParagraphsBuilderEditContext } from '#pb/types'

export function useParagraphsBuilderEditContext() {
  return inject<ParagraphsBuilderEditContext | null>(
    'paragraphsBuilderEditContext',
    null,
  )
}
