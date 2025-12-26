import { INTERNAL_BUNDLES } from '../../../../shared/constants'

export function isInternalBundle(bundle: string): boolean {
  return INTERNAL_BUNDLES.includes(bundle)
}
