import type {
  DraggableExistingBlokkliItem,
  BlokkliFieldElement,
} from '#blokkli/types'
import { buildDraggableItem, falsy } from '#blokkli/helpers'

export type BlokkliDomProvider = {
  findBlock(uuid: string): DraggableExistingBlokkliItem | undefined
  getAllBlocks(): DraggableExistingBlokkliItem[]
  findClosestBlock(
    el: Element | EventTarget,
  ): DraggableExistingBlokkliItem | undefined

  getAllFields(): BlokkliFieldElement[]
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

  const getAllFields = (): BlokkliFieldElement[] => {
    const elements = [...document.querySelectorAll('.bk-field-list')]

    return elements
      .map((element) => {
        if (element instanceof HTMLElement) {
          const key = element.dataset.fieldKey
          const name = element.dataset.fieldName
          const label = element.dataset.fieldLabel
          const isNested = element.dataset.fieldIsNested === 'true'
          const hostEntityType = element.dataset.hostEntityType
          const hostEntityUuid = element.dataset.hostEntityUuid
          const cardinality = parseInt(element.dataset.fieldCardinality || '-1')
          const allowedBundles = (
            element.dataset.fieldAllowedBundles || ''
          ).split(',')

          if (key && name && label && hostEntityType && hostEntityUuid) {
            return {
              key,
              name,
              label,
              isNested,
              hostEntityType,
              hostEntityUuid,
              cardinality: isNaN(cardinality) ? -1 : cardinality,
              allowedBundles,
              element,
            }
          }
        }
      })
      .filter(falsy)
  }

  return { findBlock, getAllBlocks, findClosestBlock, getAllFields }
}
