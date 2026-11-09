import type { EntityContext } from '#blokkli/types'

/**
 * The attributes that a block in the slot of a field in proxy mode
 * (`proxy-mode="slot"`) puts on the elements it renders while editing: its
 * uuid on all of them, and on those of the shown block, which is the real block,
 * that it's shown.
 */
export const SLOT_ITEM_ATTRIBUTE = 'data-bk-slot-item'
export const SLOT_ITEM_SHOWN_ATTRIBUTE = 'data-bk-slot-shown'

/**
 * The closest element that a block in such a slot rendered.
 */
export type SlotItemMarker = {
  /** The uuid of the block. */
  uuid: string

  /** Whether it's the shown block, not one rendered as on the site. */
  isShown: boolean
}

export type DirectiveEntityInput = {
  /**
   * The context of the component whose template has the directive, or of the
   * provider's element.
   */
  owner: EntityContext | undefined

  /** The closest element that a block in a pager field's slot rendered. */
  slotItem: SlotItemMarker | null

  /** The uuid of the entity whose field holds a block. */
  getHostUuid: (uuid: string) => string | undefined

  /** The bundle of a block. */
  getBundle: (uuid: string) => string | undefined

  /** The entity type of blocks. */
  itemEntityType: string

  /** The bundle of library items, whose fields aren't edited in place. */
  fromLibraryBundle: string
}

/**
 * The entity whose field a directive edits, or null when it edits none.
 *
 * A directive has the context of the component whose template it's in. The
 * markup that the slot of a field in proxy mode ties to one of the field's
 * blocks is in the template of the block that holds the field, so its context
 * is that block's. The block it belongs to is the one whose element it's in.
 * That's only true for this markup: a block nested in the shown block also sits
 * in its element, with a context of its own.
 */
export function resolveDirectiveEntity(
  input: DirectiveEntityInput,
): EntityContext | null {
  const { owner, slotItem } = input
  if (!owner) {
    return null
  }

  if (!slotItem || input.getHostUuid(slotItem.uuid) !== owner.uuid) {
    return owner
  }

  // A block that isn't shown renders as on the site: nothing in it is edited.
  if (!slotItem.isShown) {
    return null
  }

  const bundle = input.getBundle(slotItem.uuid)
  if (!bundle || bundle === input.fromLibraryBundle) {
    return null
  }

  return { uuid: slotItem.uuid, type: input.itemEntityType, bundle }
}

/**
 * The marker of the closest element that a block in a pager field's slot
 * rendered.
 */
export function findSlotItem(el: Element): SlotItemMarker | null {
  const item = el.closest(`[${SLOT_ITEM_ATTRIBUTE}]`)
  const uuid = item?.getAttribute(SLOT_ITEM_ATTRIBUTE)
  if (!item || !uuid) {
    return null
  }
  return { uuid, isShown: item.hasAttribute(SLOT_ITEM_SHOWN_ATTRIBUTE) }
}
