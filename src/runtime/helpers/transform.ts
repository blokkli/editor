import type { BlokkliTransformPlugin } from '../types'

export function filterTransforms(
  plugins: BlokkliTransformPlugin[],
  selectedItems: any[],
  selectedBundles: string[],
  allowedBundles: string[],
): BlokkliTransformPlugin[] {
  return plugins.filter((plugin) => {
    if (selectedItems.length < plugin.min) {
      return false
    }

    if (plugin.max !== -1 && selectedItems.length > plugin.max) {
      return false
    }

    // Check that the target bundles of the transform plugin are all allowed in the current field list.
    const allAllowedInList = plugin.targetBundles.every((bundle) =>
      allowedBundles.includes(bundle),
    )
    if (!allAllowedInList) {
      return false
    }

    // Filter for supported bundles.
    return selectedBundles.every((bundle) => plugin.bundles.includes(bundle))
  })
}
