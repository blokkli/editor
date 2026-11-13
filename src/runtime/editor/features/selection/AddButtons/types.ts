import type { ChildrenFlow } from '#blokkli/editor/helpers/dropTargets'
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'

/**
 * A side of a rectangle.
 */
export type Side = 'top' | 'right' | 'bottom' | 'left'

/**
 * Identifies a place to add a block: before or after the selected block, or
 * at the end of one of the fields of the selected block (or of the host).
 */
export type AddTargetId = 'before' | 'after' | `field:${string}`

type AddTargetBase = {
  id: AddTargetId

  /**
   * The field the new block is added to: the field of the selected block for
   * before/after, else the field itself.
   */
  field: BlokkliFieldElement

  /** The label of the button, with an ellipsis when a selector follows. */
  label: string

  /** The bundles the user may add to the field. */
  bundles: string[]

  /** The only bundle the user may add, added without the bundle selector. */
  directBundle: string | null

  /** The UUID of the block the new block is added after. */
  preceedingUuid: string | null

  /** How the children of the field are laid out. */
  flow: ChildrenFlow
}

/**
 * Add a block before or after the selected block.
 */
export type SiblingAddTarget = AddTargetBase & {
  kind: 'before' | 'after'
}

/**
 * Add a block at the end of a field.
 */
export type FieldAddTarget = AddTargetBase & {
  kind: 'field'

  /** The field has no blocks. */
  isEmpty: boolean

  /** The UUIDs of the field's blocks, in order. */
  childUuids: string[]
}

export type AddTarget = SiblingAddTarget | FieldAddTarget

/**
 * All the places to add a block for the current selection.
 */
export type AddTargets = {
  /** Identifies the selection the targets belong to. */
  key: string

  /** The selected block, or null when the host is selected. */
  uuid: string | null

  /** The UUIDs of the blocks in the selected block's field, in order. */
  siblingUuids: string[]

  list: AddTarget[]
}
