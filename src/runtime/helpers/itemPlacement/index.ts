export type ItemPlacement = {
  /** The block's index in its field. */
  index: number

  /** The type of the block that holds the field: '' for a field of the page. */
  parentType: string
}

export type FieldPlacement = {
  /** The type of the block that holds the field: '' for a field of the page. */
  parentType: string

  /** The uuids of the field's blocks, in order. */
  getUuids: () => string[]
}

/**
 * Where a <BlokkliItem> sits: what it's given counts. Else, for one of the
 * blocks of the field around it, which the field's slot renders, its index in
 * the field and the type of the block holding the field, as the field passes
 * them to the blocks it renders itself. Else, the top of the page.
 */
export function getItemPlacement(
  given: { uuid: string; index?: number; parentType?: string },
  field: FieldPlacement | null,
): ItemPlacement {
  if (given.index !== undefined && given.parentType !== undefined) {
    return { index: given.index, parentType: given.parentType }
  }

  const index = field ? field.getUuids().indexOf(given.uuid) : -1
  if (!field || index === -1) {
    return { index: given.index ?? 0, parentType: given.parentType ?? '' }
  }

  return {
    index: given.index ?? index,
    parentType: given.parentType ?? field.parentType,
  }
}
