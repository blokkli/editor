import { INTERNAL_BUNDLES } from '#blokkli/constants'

export function isInternalBundle(bundle: string): boolean {
  return INTERNAL_BUNDLES.includes(bundle)
}
