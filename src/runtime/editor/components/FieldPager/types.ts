import type { Component } from 'vue'

export type FieldPagerItem = {
  uuid: string
  bundle: string

  /**
   * The thumbnail of the block's type (the project's `thumbnail.vue`), which
   * gets the block's props. Without one, the page shows the block's type.
   */
  thumbnail?: Component

  /**
   * The props of the block, for its thumbnail.
   */
  thumbnailProps?: Record<string, unknown>
}
