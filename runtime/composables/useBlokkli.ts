import { inject } from 'vue'
import type { PbStore } from '#pb/types'
import { INJECT_APP } from '../helpers/symbols'

export function useBlokkli(): PbStore {
  return inject(INJECT_APP) as PbStore
}
