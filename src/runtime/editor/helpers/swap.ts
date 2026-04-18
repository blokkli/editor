import type { RenderedFieldListItem } from '../types/field'
import type { FieldConfig } from '../types/definitions'

type SwapValidationContext = {
  getFieldConfig: (
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ) => FieldConfig | undefined
  checkBlockBundlePermission: (bundle: string, operation: 'edit') => boolean
  blockHasRestrictedAncestor: (uuid: string) => boolean
}

/**
 * Check whether two blocks can be swapped.
 * Returns null if swap is possible, or a reason string if not.
 */
export function getSwapDisabledReason(
  blockA: RenderedFieldListItem,
  blockB: RenderedFieldListItem,
  ctx: SwapValidationContext,
): string | null {
  if (blockA.uuid === blockB.uuid) {
    return 'Cannot swap a block with itself.'
  }

  if (
    !ctx.checkBlockBundlePermission(blockA.bundle, 'edit') ||
    !ctx.checkBlockBundlePermission(blockB.bundle, 'edit')
  ) {
    return 'You do not have permission to edit one or both blocks.'
  }

  if (
    ctx.blockHasRestrictedAncestor(blockA.uuid) ||
    ctx.blockHasRestrictedAncestor(blockB.uuid)
  ) {
    return 'One or both blocks are inside a parent with restricted editing permissions.'
  }

  const fieldConfigA = ctx.getFieldConfig(
    blockA.host.type,
    blockA.host.bundle,
    blockA.host.fieldName,
  )
  const fieldConfigB = ctx.getFieldConfig(
    blockB.host.type,
    blockB.host.bundle,
    blockB.host.fieldName,
  )

  if (!fieldConfigA || !fieldConfigB) {
    return 'Could not determine field configuration for one or both blocks.'
  }

  if (
    fieldConfigA.allowedBundles.length &&
    !fieldConfigA.allowedBundles.includes(blockB.bundle)
  ) {
    return `Bundle "${blockB.bundle}" is not allowed in field "${blockA.host.fieldName}".`
  }

  if (
    fieldConfigB.allowedBundles.length &&
    !fieldConfigB.allowedBundles.includes(blockA.bundle)
  ) {
    return `Bundle "${blockA.bundle}" is not allowed in field "${blockB.host.fieldName}".`
  }

  return null
}
