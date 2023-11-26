import type { DraggableExistingParagraphItem } from '#pb/types'
import { buildDraggableItem } from '#pb/helpers'

export type PbDomProvider = {
  findParagraphItem(uuid: string): DraggableExistingParagraphItem | undefined
}

export default function (): PbDomProvider {
  const findParagraphItem = (
    uuid: string,
  ): DraggableExistingParagraphItem | undefined => {
    const el = document.querySelector(`.field-paragraphs [data-uuid="${uuid}"]`)
    if (el instanceof HTMLElement) {
      const item = buildDraggableItem(el)
      if (item?.itemType === 'existing') {
        return item
      }
    }
    return
  }

  return { findParagraphItem }
}
