import { inject } from 'vue'
import type { PbStore } from '#pb/types'

export function useBlokkli(): PbStore {
  return inject('blokkliApp') as PbStore
}
