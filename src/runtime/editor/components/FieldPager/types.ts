export type FieldPagerItem = {
  /**
   * The uuid of the block.
   */
  uuid: string

  /**
   * The type whose icon and name the page shows: for a library item, the type
   * of its block.
   */
  bundle: string

  /**
   * The block is unpublished or hidden by its options.
   */
  isMuted?: boolean
}

export type FieldPagerPageProps = FieldPagerItem & {
  /**
   * The index of the block in its field.
   */
  index: number

  /**
   * Whether the field shows the block.
   */
  isShown: boolean

  /**
   * Whether the block is selected or holds the selection.
   */
  isSelected: boolean
}
