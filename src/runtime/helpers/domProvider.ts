import type {
  DraggableExistingBlokkliItem,
  BlokkliFieldElement,
  DraggableItem,
} from '#blokkli/types'
import { buildDraggableItem, falsy } from '#blokkli/helpers'

const buildFieldElement = (
  element: HTMLElement,
): BlokkliFieldElement | undefined => {
  const key = element.dataset.fieldKey
  const name = element.dataset.fieldName
  const label = element.dataset.fieldLabel
  const blockCount = parseInt(element.dataset.fieldBlockCount || '0')
  const isNested = element.dataset.fieldIsNested === 'true'
  const hostEntityType = element.dataset.hostEntityType
  const hostEntityBundle = element.dataset.hostEntityBundle
  const hostEntityUuid = element.dataset.hostEntityUuid
  const cardinality = parseInt(element.dataset.fieldCardinality || '-1')
  const allowedBundles = (element.dataset.fieldAllowedBundles || '').split(',')

  if (key && name && label && hostEntityType && hostEntityUuid) {
    return {
      key,
      name,
      label,
      isNested,
      hostEntityType,
      hostEntityUuid,
      hostEntityBundle,
      cardinality: isNaN(cardinality) ? -1 : cardinality,
      allowedBundles,
      element,
      blockCount: isNaN(blockCount) ? 0 : blockCount,
    }
  }
}

export type BlokkliDomProvider = {
  findBlock(uuid: string): DraggableExistingBlokkliItem | undefined
  getAllBlocks(): DraggableExistingBlokkliItem[]
  findClosestBlock(
    el: Element | EventTarget,
  ): DraggableExistingBlokkliItem | undefined

  getAllFields(): BlokkliFieldElement[]

  /**
   * Return the droppable markup for a draggable item.
   */
  getDropElementMarkup(item: DraggableItem): string

  getBlockField(uuid: string): BlokkliFieldElement
  findField(
    entityUuid: string,
    fieldName: string,
  ): BlokkliFieldElement | undefined
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
          return buildFieldElement(element)
        }
      })
      .filter(falsy)
  }

  const getDropElementMarkup = (item: DraggableItem): string => {
    const dropElement =
      item.element().querySelector('.bk-drop-element') || item.element()
    // Remove all data attributes.
    return dropElement.outerHTML.replace(/\sdata-\w+="[^"]*"/g, '')
  }

  const getBlockField = (uuid: string): BlokkliFieldElement => {
    const block = findBlock(uuid)
    if (!block) {
      throw new Error('Block does not exist: ' + uuid)
    }
    const el = block.element().closest('.bk-field-list')
    if (!(el instanceof HTMLElement)) {
      throw new Error('Failed to locate field element for block: ' + uuid)
    }

    const field = buildFieldElement(el)
    if (!field) {
      throw new Error('Failed to build field for block: ' + uuid)
    }

    return field
  }

  const findField = (
    uuid: string,
    fieldName: string,
  ): BlokkliFieldElement | undefined => {
    const el = document.querySelector(
      `[data-field-name="${fieldName}"][data-host-entity-uuid="${uuid}"]`,
    )
    if (!(el instanceof HTMLElement)) {
      return
    }
    return buildFieldElement(el)
  }

  return {
    findBlock,
    getAllBlocks,
    findClosestBlock,
    getAllFields,
    getDropElementMarkup,
    getBlockField,
    findField,
  }
}
