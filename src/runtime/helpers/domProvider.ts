import type {
  DraggableExistingBlock,
  BlokkliFieldElement,
  DraggableItem,
} from '#blokkli/types'
import { buildDraggableItem, falsy } from '#blokkli/helpers'

/**
 * Recursively clone an element and inline its styles.
 */
const cloneWithInlineStyles = (node: Element): Element => {
  // Clone the element.
  const clone = node.cloneNode(false) as Element

  // Remove attributes.
  clone.removeAttribute('class')
  clone.removeAttribute('id')
  clone.removeAttribute('name')
  clone.removeAttribute('for')
  clone.removeAttribute('style')

  // Remove all data attributes.
  if (clone instanceof HTMLElement || clone instanceof SVGElement) {
    Object.keys(clone.dataset).forEach((key) => {
      delete clone.dataset[key]
    })
  }

  // Get the computed styles and inline them as a style attribute.
  const computedStyle = getComputedStyle(node)
  for (let i = 0; i < computedStyle.length; i++) {
    const propName = computedStyle[i] as any
    if (clone instanceof HTMLElement || clone instanceof SVGElement) {
      clone.style[propName] = computedStyle.getPropertyValue(propName)
    }
  }

  // Recursively clone and append child nodes.
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      // Clone child elements.
      clone.appendChild(cloneWithInlineStyles(child as Element))
    } else if (child.nodeType === Node.TEXT_NODE) {
      // Directly append text nodes.
      clone.appendChild(child.cloneNode(true))
    }
  })

  return clone
}

const cloneElementWithStyles = (element: Element): string => {
  // Create a deep clone of the element with inline styles
  const clonedElement = cloneWithInlineStyles(element)

  // Create a temporary container to generate the outer HTML
  const container = document.createElement('div')
  container.appendChild(clonedElement)
  console.log(container)

  return container.innerHTML
}

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

  if (
    key &&
    name &&
    label &&
    hostEntityType &&
    hostEntityUuid &&
    hostEntityBundle
  ) {
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

export type DomProvider = {
  findBlock(uuid: string): DraggableExistingBlock | undefined
  getAllBlocks(): DraggableExistingBlock[]
  findClosestBlock(
    el: Element | EventTarget,
  ): DraggableExistingBlock | undefined

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

export default function (): DomProvider {
  const findBlock = (uuid: string): DraggableExistingBlock | undefined => {
    const el = document.querySelector(
      `.bk-field-list [data-uuid="${uuid}"]:not(.bk-sortli-leave-active)`,
    )
    if (el instanceof HTMLElement) {
      const item = buildDraggableItem(el)
      if (item?.itemType === 'existing') {
        return item
      }
    }
    return
  }

  const getAllBlocks = (): DraggableExistingBlock[] => {
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
  ): DraggableExistingBlock | undefined => {
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
    const el = item.element()
    const dropElement = el.querySelector('.bk-drop-element') || el
    return cloneElementWithStyles(dropElement).replace(
      /\sdata-\w+="[^"]*"/g,
      '',
    )
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
