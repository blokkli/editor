import { ref } from '#imports'
import type {
  DraggableExistingBlock,
  BlokkliFieldElement,
  DraggableItem,
  DroppableEntityField,
  EntityContext,
} from '#blokkli/types'
import {
  findClosestBlock,
  buildDraggableItem,
  falsy,
  mapDroppableField,
} from '#blokkli/helpers'
import type { ComponentInternalInstance } from 'vue'

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

const cloneElementWithStyles = (element: Element, isRoot?: boolean): string => {
  // Create a deep clone of the element with inline styles
  const clonedElement = cloneWithInlineStyles(element)
  if (
    isRoot &&
    (clonedElement instanceof HTMLElement ||
      clonedElement instanceof SVGElement)
  ) {
    clonedElement.style.opacity = '1'
  }

  // Create a temporary container to generate the outer HTML
  const container = document.createElement('div')
  container.appendChild(clonedElement)

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
  getDropElementMarkup(item: DraggableItem, checkSize?: boolean): string

  getBlockField(uuid: string): BlokkliFieldElement
  findField(
    entityUuid: string,
    fieldName: string,
  ): BlokkliFieldElement | undefined

  registerBlock: (
    uuid: string,
    instance: ComponentInternalInstance | null,
  ) => void
  unregisterBlock: (uuid: string) => void

  /**
   * Get all droppable entity fields.
   */
  getAllDroppableFields(): DroppableEntityField[]

  findClosestEntityContext(el: HTMLElement): EntityContext | undefined
}

const getVisibleBlockElement = (
  instance: ComponentInternalInstance,
): HTMLElement | undefined => {
  if (instance.vnode.el instanceof HTMLElement) {
    return instance.vnode.el
  } else if (instance?.vnode.el instanceof Text) {
    // In case of text nodes (e.g. when the first node of the component
    // is a comment, find the first matching sibling that is an element.
    if (instance?.vnode.el.nextElementSibling instanceof HTMLElement) {
      return instance.vnode.el.nextElementSibling
    }
  }
}

export default function (): DomProvider {
  const registeredBlocks = ref<Record<string, HTMLElement | undefined>>({})

  const registerBlock = (
    uuid: string,
    instance: ComponentInternalInstance | null,
  ) => {
    if (!instance) {
      console.error(
        `Failed to get component instance of block with UUID "${uuid}"`,
      )
      return
    }
    const el = getVisibleBlockElement(instance)
    if (!el) {
      console.error(
        `Failed to locate block component element for UUID "${uuid}". Make sure the block renders at least one root element that is always visible.`,
      )
      return
    }
    registeredBlocks.value[uuid] = el
  }

  const unregisterBlock = (uuid: string) => {
    registeredBlocks.value[uuid] = undefined
  }

  const findBlock = (uuid: string): DraggableExistingBlock | undefined => {
    const el = registeredBlocks.value[uuid]
    if (!el) {
      return
    }
    const item = buildDraggableItem(el)
    if (item?.itemType === 'existing') {
      return item
    }
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

  const getDropElementMarkup = (
    item: DraggableItem,
    checkSize?: boolean,
  ): string => {
    const el =
      item.itemType === 'existing' ? item.dragElement() : item.element()
    const dropElement = el.querySelector('.bk-drop-element') || el
    const childCount = dropElement.querySelectorAll('*').length
    if (checkSize && childCount > 80) {
      return ''
    }
    return cloneElementWithStyles(dropElement, true).replace(
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

  const getAllDroppableFields = () =>
    [...document.querySelectorAll('[data-blokkli-droppable-field]')].map(
      mapDroppableField,
    )

  const findClosestEntityContext = (el: HTMLElement) => {
    const provider = el.closest('[data-blokkli-provider-active="true"]')
    if (!(provider instanceof HTMLElement)) {
      return
    }
    const uuid = provider.dataset.providerUuid
    const type = provider.dataset.providerEntityType
    const bundle = provider.dataset.providerEntityBundle
    if (uuid && type && bundle) {
      return {
        uuid,
        type,
        bundle,
      }
    }
  }

  return {
    findBlock,
    getAllBlocks,
    findClosestBlock,
    getAllFields,
    getDropElementMarkup,
    getBlockField,
    findField,
    registerBlock,
    unregisterBlock,
    getAllDroppableFields,
    findClosestEntityContext,
  }
}
