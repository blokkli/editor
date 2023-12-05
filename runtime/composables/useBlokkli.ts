import { inject } from 'vue'
import type { BlokkliApp } from '#blokkli/types'
import { INJECT_APP } from '../helpers/symbols'

export function useBlokkli(): BlokkliApp {
  return inject(INJECT_APP) as BlokkliApp
}
