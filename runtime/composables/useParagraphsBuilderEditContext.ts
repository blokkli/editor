import { inject } from 'vue'
import { ParagraphsBuilderEditContext } from './../components/Edit/types'

export function useParagraphsBuilderEditContext() {
  return inject<ParagraphsBuilderEditContext | null>(
    'paragraphsBuilderEditContext',
    null,
  )
}
