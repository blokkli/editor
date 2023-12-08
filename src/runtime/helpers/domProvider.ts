import type { DraggableExistingBlokkliItem } from '#blokkli/types'
import { buildDraggableItem, falsy } from '#blokkli/helpers'

export type BlokkliDomProvider = {
  findBlock(uuid: string): DraggableExistingBlokkliItem | undefined
  getAllBlocks(): DraggableExistingBlokkliItem[]
  findClosestBlock(
    el: Element | EventTarget,
  ): DraggableExistingBlokkliItem | undefined
}

export default function (): BlokkliDomProvider {
  const findBlock = (
    uuid: string,
  ): DraggableExistingBlokkliItem | undefined => {
    const el = document.querySelector(`.bk-field-list [data-uuid="${uuid}"]`)
    if (el instanceof HTMLElement) {
      const item = buildDraggableItem(el)
      if (item?.itemType === 'existing') {
        return item
      }
    }
    return
  }

  const getAllBlocks = (): DraggableExistingBlokkliItem[] => {
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
  ): DraggableExistingBlokkliItem | undefined => {
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
