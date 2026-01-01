import {
  fragmentBlockBundle,
  fromLibraryBlockBundle,
} from '#blokkli-build/config'

const INTERNAL_BUNDLES: string[] = [fromLibraryBlockBundle, fragmentBlockBundle]

export function isInternalBundle(bundle: string): boolean {
  return INTERNAL_BUNDLES.includes(bundle)
}
