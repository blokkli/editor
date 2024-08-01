import type { ComponentInternalInstance } from 'vue'
import { reactive, ref, computed, type ComputedRef } from '#imports'
import type {
  DraggableExistingBlock,
  BlokkliFieldElement,
  DraggableItem,
  DroppableEntityField,
  EntityContext,
  Rectangle,
} from '#blokkli/types'
import {
  findClosestBlock,
  buildDraggableItem,
  falsy,
  mapDroppableField,
  findClosestEntityContext,
} from '#blokkli/helpers'
import type { UiProvider } from './uiProvider'
import { cloneElementWithStyles } from './dom'
import onBlokkliEvent from './composables/onBlokkliEvent'
import useDelayedIntersectionObserver from './composables/useDelayedIntersectionObserver'
import { getDefinition } from '#blokkli/definitions'
import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli/generated-types'
import type { DebugProvider } from './debugProvider'

const buildFieldElement = (
  element: HTMLElement,
): BlokkliFieldElement | undefined => {
  const key = element.dataset.fieldKey
  const name = element.dataset.fieldName
  const label = element.dataset.fieldLabel
  const isNested = element.dataset.fieldIsNested === 'true'
  const fieldListType = element.dataset.fieldListType as
    | ValidFieldListTypes
    | undefined
  const hostEntityType = element.dataset.hostEntityType
  const hostEntityBundle = element.dataset.hostEntityBundle
  const hostEntityUuid = element.dataset.hostEntityUuid
  const dropAlignment = element.dataset.fieldDropAlignment
  const cardinality = Number.parseInt(element.dataset.fieldCardinality || '-1')
  const allowedBundles = (element.dataset.fieldAllowedBundles || '')
    .split(',')
    .filter(Boolean)
  const allowedFragments = (element.dataset.allowedFragments || '')
    .split(',')
    .filter(Boolean)

  if (
    key &&
    name &&
    label &&
    hostEntityType &&
    hostEntityUuid &&
    hostEntityBundle &&
    fieldListType
  ) {
    return {
      key,
      name,
      label,
      isNested,
      hostEntityType,
      hostEntityUuid,
      hostEntityBundle,
      cardinality: Number.isNaN(cardinality) ? -1 : cardinality,
      allowedBundles,
      allowedFragments,
      fieldListType,
      element,
      dropAlignment:
        dropAlignment === 'vertical' || dropAlignment === 'horizontal'
          ? dropAlignment
          : undefined,
    }
  }
}

type MeasuredBlockRect = Rectangle & { time: number }

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
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBlockBundle?: BlockBundleWithNested,
  ) => void
  unregisterBlock: (uuid: string) => void

  registerField: (
    uuid: string,
    fieldName: string,
    instance: HTMLElement,
  ) => void
  unregisterField: (uuid: string, fieldName: string) => void

  /**
   * Get all droppable entity fields.
   */
  getAllDroppableFields(): DroppableEntityField[]

  findClosestEntityContext(el: HTMLElement): EntityContext | undefined

  getBlockVisibilities(): Record<string, boolean>
  getVisibleBlocks(): string[]
  getVisibleFields(): string[]

  getActiveProviderElement: () => HTMLElement

  getBlockRects: () => Record<string, MeasuredBlockRect>
  getBlockRect: (uuid: string) => MeasuredBlockRect | undefined
  refreshBlockRect: (uuid: string) => void

  getFieldRect: (key: string) => Rectangle | undefined

  isReady: ComputedRef<boolean>

  init: () => void

  /**
   * Get the drag element for a block.
   */
  getDragElement: (block: DraggableExistingBlock) => HTMLElement | undefined
}

const getVisibleBlockElement = (
  instance: ComponentInternalInstance,
): HTMLElement | undefined => {
  if (instance.vnode.el instanceof HTMLElement) {
    return instance.vnode.el
  } else if (
    instance?.vnode.el instanceof Text &&
    instance?.vnode.el.nextElementSibling instanceof HTMLElement
  ) {
    // In case of text nodes (e.g. when the first node of the component
    // is a comment, find the first matching sibling that is an element.
    return instance.vnode.el.nextElementSibling
  }
}

function rectWithTime(rect: Rectangle, time?: number): MeasuredBlockRect {
  return {
    ...rect,
    time: time || performance.now(),
  }
}

export default function (ui: UiProvider, debug: DebugProvider): DomProvider {
  const logger = debug.createLogger('DomProvider')
  const mutationsReady = ref(true)
  const intersectionReady = ref(false)
  const blockVisibility: Record<string, boolean> = {}
  const visibleBlocks: Set<string> = new Set()
  const visibleFields: Set<string> = new Set()
  const blockRects: Record<string, MeasuredBlockRect> = {}
  const fieldRects: Record<string, Rectangle> = {}
  let draggableBlockCache: Record<string, DraggableExistingBlock> = {}

  const resizeObserver = new ResizeObserver(function (
    entries: ResizeObserverEntry[],
  ) {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) {
        return
      }

      const uuid =
        entry.target.dataset.uuid ||
        (entry.target.closest('[data-uuid]') as HTMLElement | undefined)
          ?.dataset.uuid
      if (!uuid) {
        return
      }

      const currentRect = blockRects[uuid]

      const now = performance.now()

      if (!currentRect) {
        blockRects[uuid] = rectWithTime(
          {
            x: entry.contentRect.x,
            y: entry.contentRect.y,
            width: entry.borderBoxSize[0].inlineSize,
            height: entry.borderBoxSize[0].blockSize,
          },
          now,
        )
        return
      }

      if (currentRect.time > now) {
        return
      }

      blockRects[uuid].width = entry.borderBoxSize[0].inlineSize
      blockRects[uuid].height = entry.borderBoxSize[0].blockSize
      blockRects[uuid].time = now
    }
  })

  function intersectionCallback(entries: IntersectionObserverEntry[]) {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value
    for (const entry of entries) {
      if (entry.target instanceof HTMLElement) {
        const uuid =
          entry.target.dataset.uuid ||
          (entry.target.closest('[data-uuid]') as HTMLElement | undefined)
            ?.dataset.uuid
        const fieldKey = entry.target.dataset.fieldKey
        const rect = entry.boundingClientRect
        if (fieldKey) {
          if (entry.isIntersecting) {
            visibleFields.add(fieldKey)
          } else {
            visibleFields.delete(fieldKey)
          }
          fieldRects[fieldKey] = ui.getAbsoluteElementRect(rect, scale, offset)
        } else if (uuid) {
          const newRect = ui.getAbsoluteElementRect(rect, scale, offset)
          const currentRect = blockRects[uuid]

          // Rect already exists.
          if (currentRect) {
            // The time of the rect is larger than the time of the entry.
            // This indicates that the resize observer has already updated the width and/or height.
            // We only need to update the X and Y coordinates.
            if (currentRect.time > entry.time) {
              blockRects[uuid].x = newRect.x
              blockRects[uuid].y = newRect.y
            } else {
              blockRects[uuid] = rectWithTime(newRect, entry.time)
            }
          } else {
            blockRects[uuid] = rectWithTime(newRect, entry.time)
          }
          if (entry.isIntersecting) {
            visibleBlocks.add(uuid)
          } else {
            visibleBlocks.delete(uuid)
          }
          blockVisibility[uuid] = entry.isIntersecting
        }
      }
    }
  }

  const observer = useDelayedIntersectionObserver(intersectionCallback)

  const registeredBlocks = reactive<Record<string, HTMLElement | undefined>>({})
  const registeredFields = reactive<Record<string, HTMLElement | undefined>>({})

  const registerField = (
    uuid: string,
    fieldName: string,
    element: HTMLElement,
  ) => {
    const key = `${uuid}:${fieldName}`
    registeredFields[key] = element
    observer.observe(element)
  }

  const unregisterField = (uuid: string, fieldName: string) => {
    const key = `${uuid}:${fieldName}`
    const el = registeredFields[key]
    if (el) {
      observer.unobserve(el)
    }
    registeredFields[key] = undefined
  }

  function getElementToObserve(
    el: HTMLElement,
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBlockBundle?: BlockBundleWithNested,
  ): HTMLElement {
    const definition = getDefinition(bundle, fieldListType, parentBlockBundle)
    if (!definition) {
      throw new Error('Failed to load definition for bundle: ' + bundle)
    }
    const observableElement =
      (definition.editor?.getDraggableElement
        ? definition.editor.getDraggableElement(el)
        : el) || el
    if (observableElement instanceof HTMLElement) {
      return observableElement
    }

    return el
  }

  const registerBlock = (
    uuid: string,
    instance: ComponentInternalInstance | null,
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBlockBundle?: BlockBundleWithNested,
  ) => {
    if (registeredBlocks[uuid]) {
      console.error(
        'Trying to register block with already existing UUID: ' + uuid,
      )
    }
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
    const observableElement = getElementToObserve(
      el,
      bundle,
      fieldListType,
      parentBlockBundle,
    )
    observer.observe(observableElement)
    resizeObserver.observe(observableElement)
    registeredBlocks[uuid] = el
  }

  const unregisterBlock = (uuid: string) => {
    const el = registeredBlocks[uuid]
    if (el) {
      observer.unobserve(el)
      resizeObserver.unobserve(el)
    }
    registeredBlocks[uuid] = undefined
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete blockRects[uuid]
  }

  const findBlock = (uuid: string): DraggableExistingBlock | undefined => {
    const cached = draggableBlockCache[uuid]
    if (cached) {
      return cached
    }
    const el = registeredBlocks[uuid]
    if (!el) {
      return
    }
    const item = buildDraggableItem(el)
    if (item?.itemType === 'existing') {
      draggableBlockCache[uuid] = item
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
      item.itemType === 'existing' ? getDragElement(item) : item.element()
    if (!el) {
      return ''
    }
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
      throw new TypeError('Failed to locate field element for block: ' + uuid)
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

  const getBlockVisibilities = () => {
    return blockVisibility
  }

  const getVisibleBlocks = () => Array.from(visibleBlocks)
  const getVisibleFields = () => Array.from(visibleFields)

  const getActiveProviderElement = () => {
    const el = document.querySelector('[data-blokkli-provider-active="true"]')
    if (!el) {
      throw new Error('Failed to find active <BlokkliProvider> element.')
    }

    if (!(el instanceof HTMLElement)) {
      throw new TypeError(
        'The root element of the active <BlokkliProvider> is not an HTMLElement.',
      )
    }
    return el
  }

  function getBlockRects(): Record<string, MeasuredBlockRect> {
    return blockRects
  }

  function getBlockRect(uuid: string): MeasuredBlockRect | undefined {
    return blockRects[uuid]
  }

  function getFieldRect(key: string): Rectangle | undefined {
    return fieldRects[key]
  }

  function refreshBlockRect(uuid: string) {
    const block = findBlock(uuid)
    if (!block) {
      return
    }
    const el = getDragElement(block)
    if (!el) {
      return
    }

    blockRects[uuid] = rectWithTime(
      ui.getAbsoluteElementRect(el.getBoundingClientRect()),
    )
  }

  function refreshFieldRect(key: string) {
    const el = document.querySelector(
      `.bk-draggable-list-container[data-field-key="${key}"]`,
    )
    if (!(el instanceof HTMLElement)) {
      return
    }

    fieldRects[key] = ui.getAbsoluteElementRect(el.getBoundingClientRect())
  }

  let stateReloadTimeout: number | null = null

  function updateVisibleRects() {
    const visible = getVisibleBlocks()
    const offset = ui.artboardOffset.value
    const scale = ui.artboardScale.value
    for (let i = 0; i < visible.length; i++) {
      const uuid = visible[i]
      const el = registeredBlocks[uuid]
      if (!el) {
        continue
      }
      const bundle = el.dataset.itemBundle
      const hostBundle = el.dataset.hostBundle as
        | BlockBundleWithNested
        | undefined
      const hostFieldListType = el.dataset.hostFieldListType as
        | ValidFieldListTypes
        | undefined

      if (!bundle || !hostFieldListType) {
        continue
      }
      const observableElement = getElementToObserve(
        el,
        bundle,
        hostFieldListType,
        hostBundle,
      )

      blockRects[uuid] = rectWithTime(
        ui.getAbsoluteElementRect(
          observableElement.getBoundingClientRect(),
          scale,
          offset,
        ),
      )
    }

    const visibleFieldKeys = getVisibleFields()
    for (let i = 0; i < visibleFieldKeys.length; i++) {
      const key = visibleFieldKeys[i]
      const field = registeredFields[key]
      if (!field) {
        continue
      }
      fieldRects[key] = ui.getAbsoluteElementRect(
        field.getBoundingClientRect(),
        scale,
        offset,
      )
    }
  }

  // After the state has been updated, update the rects of all currently visible blocks.
  onBlokkliEvent('state:reloaded', () => {
    draggableBlockCache = {}

    if (stateReloadTimeout) {
      window.clearTimeout(stateReloadTimeout)
    }

    stateReloadTimeout = window.setTimeout(updateVisibleRects, 300)
  })

  onBlokkliEvent('ui:resized', function () {
    getVisibleBlocks().forEach(refreshBlockRect)
    getVisibleFields().forEach(refreshFieldRect)
    logger.log('Refreshed all visible rects')
  })

  function init() {
    observer.init()
    intersectionReady.value = true
    logger.log('IntersectionObserver initialized')
  }

  const dragElementUuidMap = new WeakMap<Node, string>()
  const dragElementCache: Map<string, HTMLElement> = new Map()

  // Callback function to execute when mutations are observed
  const callback = function (mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach((node) => {
          const uuid = dragElementUuidMap.get(node)
          // Delete the drag element from the map.
          dragElementUuidMap.delete(node)
          if (uuid) {
            dragElementCache.delete(uuid)
          }
        })
      }
    }
  }

  // Create an observer instance linked to the callback function
  const mutationObserver = new MutationObserver(callback)

  function getDragElement(block: DraggableExistingBlock) {
    const cached = dragElementCache.get(block.uuid)
    if (cached && document.body.contains(cached)) {
      return cached
    }
    const el = block.element()
    if (!el) {
      return
    }
    if (el.parentNode) {
      mutationObserver.observe(el.parentNode, { childList: true })
    }
    dragElementUuidMap.set(el, block.uuid)
    dragElementCache.set(block.uuid, el)
    return el
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
    getBlockVisibilities,
    getVisibleBlocks,
    getVisibleFields,
    registerField,
    unregisterField,
    getActiveProviderElement,
    getBlockRects,
    getBlockRect,
    getFieldRect,
    refreshBlockRect,
    isReady: computed(() => mutationsReady.value && intersectionReady.value),
    init,
    getDragElement,
  }
}
