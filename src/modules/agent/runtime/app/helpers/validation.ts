import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
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
