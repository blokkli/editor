import { inject } from 'vue'
import type { PbStore } from './../types'

export function useParagraphsBuilderStore(): PbStore {
  return inject('paragraphsBuilderStore') as PbStore
}
