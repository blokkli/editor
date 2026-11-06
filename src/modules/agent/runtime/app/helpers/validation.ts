import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import type { BlockPermission } from '#blokkli/editor/types/definitions'
import type { ToolError } from '../types'
import { getFieldKey } from '#blokkli/helpers'

type ValidationResult = { valid: true } | { valid: false; error: string }

/**
 * Validate that all blocks exist and return them.
 */
export function validateBlocksExist(
  app: BlokkliApp,
  uuids: string[],
): { blocks: RenderedFieldListItem[] } | { error: string } {
  const blocks: RenderedFieldListItem[] = []
  for (const uuid of uuids) {
    const block = app.blocks.getBlock(uuid)
    if (!block) {
      return { error: `Paragraph not found: ${uuid}` }
    }
    blocks.push(block)
  }
  return { blocks }
}

/**
 * Validate that all blocks are in the same field.
 * Returns the field key if valid.
 */
export function validateSameField(
  blocks: RenderedFieldListItem[],
):
  | { fieldKey: string; host: RenderedFieldListItem['host'] }
  | { error: string } {
  if (blocks.length === 0) {
    return { error: 'No paragraphs provided' }
  }

  const firstBlock = blocks[0]!
  const fieldKey = getFieldKey(firstBlock.host.uuid, firstBlock.host.fieldName)

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]!
    const blockFieldKey = getFieldKey(block.host.uuid, block.host.fieldName)
    if (blockFieldKey !== fieldKey) {
      return { error: 'All paragraphs must be in the same field' }
    }
  }

  return { fieldKey, host: firstBlock.host }
}

/**
 * Validate that field cardinality allows adding N blocks.
 */
export function validateFieldCardinality(
  app: BlokkliApp,
  host: RenderedFieldListItem['host'],
  fieldKey: string,
  additionalCount: number,
): ValidationResult {
  const fieldConfig = app.types.getFieldConfig(
    host.type,
    host.bundle,
    host.fieldName,
  )

  if (!fieldConfig) {
    return {
      valid: false,
      error: `Field configuration not found for ${host.fieldName}`,
    }
  }

  // -1 means unlimited cardinality
  if (fieldConfig.cardinality === -1) {
    return { valid: true }
  }

  const currentCount = app.state.getFieldBlockCount(fieldKey)
  if (currentCount + additionalCount > fieldConfig.cardinality) {
    return {
      valid: false,
      error: `Field "${host.fieldName}" can only hold ${fieldConfig.cardinality} paragraphs (currently has ${currentCount}, trying to add ${additionalCount})`,
    }
  }

  return { valid: true }
}

/**
 * Validate that all bundles are allowed in the field.
 */
export function validateBundlesAllowed(
  app: BlokkliApp,
  host: RenderedFieldListItem['host'],
  bundles: string[],
): ValidationResult {
  const fieldConfig = app.types.getFieldConfig(
    host.type,
    host.bundle,
    host.fieldName,
  )

  if (!fieldConfig) {
    return {
      valid: false,
      error: `Field configuration not found for ${host.fieldName}`,
    }
  }

  // Empty allowedBundles means all are allowed
  if (!fieldConfig.allowedBundles.length) {
    return { valid: true }
  }

  const disallowed = bundles.filter(
    (b) => !fieldConfig.allowedBundles.includes(b),
  )
  if (disallowed.length > 0) {
    return {
      valid: false,
      error: `Bundle(s) "${disallowed.join(', ')}" not allowed in field "${host.fieldName}"`,
    }
  }

  return { valid: true }
}

/**
 * Check that the field holding each block can change: that it isn't read-only
 * and that no ancestor restricts editing. Returns a ToolError if any block is
 * in such a field, or undefined if all are in fields that can change. A UUID
 * that isn't a block, such as the page's, is in no field.
 */
export function requireCanChangeBlockField(
  app: BlokkliApp,
  uuids: string[],
): ToolError | undefined {
  for (const uuid of uuids) {
    if (
      app.blocks.getBlock(uuid) &&
      !app.permissions.canChangeBlockField(uuid)
    ) {
      return {
        error:
          'Permission denied: paragraph is in a field that is read-only, or inside a parent with restricted editing permissions',
      }
    }
  }
  return undefined
}

/**
 * Check that paragraphs can be added to a field of a parent: that the field
 * isn't read-only and that the parent may be edited. Returns a ToolError if
 * not, or undefined if they can. A parent that doesn't exist is left to the
 * other checks.
 */
export function requireCanChangeField(
  app: BlokkliApp,
  parent: { type: string; uuid: string; field: string },
): ToolError | undefined {
  const { context } = app
  const bundle =
    parent.uuid === context.value.entityUuid
      ? context.value.entityBundle
      : app.blocks.getBlock(parent.uuid)?.bundle
  if (!bundle) {
    return undefined
  }
  const host = { type: parent.type, bundle, uuid: parent.uuid }
  if (!app.permissions.canChangeField(host, parent.field)) {
    return {
      error: `Permission denied: field "${parent.field}" is read-only, or its parent may not be edited`,
    }
  }
  return undefined
}

/**
 * Check that blocks aren't moved into themselves: into one of their own fields,
 * or into a block nested in them. Returns a ToolError if the target parent is
 * one of the blocks or nested in one, or undefined otherwise.
 */
export function requireNotMovedIntoItself(
  app: BlokkliApp,
  uuids: string[],
  parentUuid: string,
): ToolError | undefined {
  const into = uuids.find(
    (uuid) => uuid === parentUuid || app.state.isChildOf(parentUuid, uuid),
  )
  if (into) {
    return {
      error: `Paragraph ${into} cannot be moved into itself or into a paragraph nested in it`,
    }
  }
  return undefined
}

/**
 * Check that the user has a specific permission for all given bundles.
 * Returns a ToolError if any bundle is denied, or undefined if all are allowed.
 */
export function requireBundlePermission(
  app: BlokkliApp,
  bundles: string[],
  operation: BlockPermission,
): ToolError | undefined {
  const denied = app.permissions.filterDeniedBundles(bundles, operation)
  if (denied.length > 0) {
    const labels = denied.map(
      (b) => app.types.getBlockBundleDefinition(b)?.label || b,
    )
    return {
      error: `Permission denied: cannot ${operation} ${labels.map((l) => `"${l}"`).join(', ')}`,
    }
  }
  return undefined
}
