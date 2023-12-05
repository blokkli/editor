import type { DraggableExistingParagraphItem } from '#blokkli/types'
import { buildDraggableItem, falsy } from '#blokkli/helpers'

export type BlokkliDomProvider = {
  findBlock(uuid: string): DraggableExistingParagraphItem | undefined
  getAllBlocks(): DraggableExistingParagraphItem[]
  findClosestBlock(
    el: Element | EventTarget,
  ): DraggableExistingParagraphItem | undefined
}

export default function (): BlokkliDomProvider {
  const findBlock = (
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

  const getAllBlocks = (): DraggableExistingParagraphItem[] => {
    return [
      ...document.querySelectorAll(
        '[data-blokkli-provider-active="true"] [data-uuid]',
      ),
    ]
      .map((v) => {
        const item = buildDraggableItem(v)
        if (item?.itemType === 'existing') {
          return item
        }
      })
      .filter(falsy)
  }

  const findClosestBlock = (
    el: Element | EventTarget,
  ): DraggableExistingParagraphItem | undefined => {
    if (!(el instanceof Element)) {
      return
    }
    const closest = el.closest('[data-element-type="existing"]')
    if (!closest) {
      return
    }
    const item = buildDraggableItem(closest)
    if (item?.itemType !== 'existing') {
      return
    }
    return item
  }

  return { findBlock, getAllBlocks, findClosestBlock }
}
