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

type RegisteredField = {
  element: HTMLElement
  entity: EntityContext
  fieldName: string
}

type RegisteredFieldType = {
  entityType: string
  entityBundle: string
  fieldName: string
}

const buildFieldElement = (
  element: HTMLElement,
): BlokkliFieldElement | undefined => {
  const key = element.dataset.fieldKey
  const name = element.dataset.fieldName
  const label = element.dataset.fieldLabel
  const isNested = element.dataset.fieldIsNested === 'true'
  const nestingLevel = Number.parseInt(element.dataset.bkNestingLevel || '0')
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
      nestingLevel,
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

  /**
   * Return the droppable markup for a draggable item.
   */
  getDropElementMarkup(item: DraggableItem, checkSize?: boolean): string

  findField(
    entityUuid: string,
    fieldName: string,
  ): BlokkliFieldElement | undefined

  registerField: (
    entity: EntityContext,
    fieldName: string,
    instance: HTMLElement,
  ) => void
  updateFieldElement: (
    entity: EntityContext,
    fieldName: string,
    element: HTMLElement,
  ) => void
  unregisterField: (entity: EntityContext, fieldName: string) => void

  registeredFieldTypes: ComputedRef<RegisteredFieldType[]>

  /**
   * Get all droppable entity fields.
   */
  getAllDroppableFields(): DroppableEntityField[]

  findClosestEntityContext(el: HTMLElement): EntityContext | undefined

  getVisibleBlocks(): string[]
  getVisibleFields(): string[]
  isBlockVisible(uuid: string): boolean

  getActiveProviderElement: () => HTMLElement

  getBlockRects: () => Record<string, MeasuredBlockRect>
  getBlockRect: (uuid: string) => MeasuredBlockRect | undefined
  refreshBlockRect: (uuid: string) => void

  getFieldRect: (key: string) => Rectangle | undefined

  updateVisibleRects: () => void

  isReady: ComputedRef<boolean>

  init: () => void

  /**
   * Get the drag element for a block.
   */
  getDragElement: (block: DraggableExistingBlock) => HTMLElement | undefined
}

function rectWithTime(rect: Rectangle, time?: number): MeasuredBlockRect {
  return {
    ...rect,
    time: time || performance.now(),
  }
}

export default function (ui: UiProvider, debug: DebugProvider): DomProvider {
  const artboardElement = ui.artboardElement()
  const logger = debug.createLogger('DomProvider')
  const mutationsReady = ref(true)
  const intersectionReady = ref(false)
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
        // Using entry.boundingClientRect here would result in wrong values,
        // because the IntersectionObserver is queued and could be delayed.
        // If we were to derive the document-relative position for a block
        // using these potentially stale values, it would result in completely
        // wrong position data.
        const rect = entry.target.getBoundingClientRect()
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
        }
      }
    }
  }

  const intersectionObserver =
    useDelayedIntersectionObserver(intersectionCallback)

  const registeredBlocks = reactive<Record<string, HTMLElement | undefined>>({})
  const registeredFields = reactive<
    Record<string, RegisteredField | undefined>
  >({})

  const registeredFieldTypes = computed<RegisteredFieldType[]>(() => {
    const fields = Object.values(registeredFields)
    const found = new Set<string>()
    const uniqueFieldTypes: RegisteredFieldType[] = []

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      if (field) {
        const key = `${field.entity.type}:${field.entity.bundle}:${field.fieldName}`
        if (!found.has(key)) {
          uniqueFieldTypes.push({
            entityType: field.entity.type,
            entityBundle: field.entity.bundle,
            fieldName: field.fieldName,
          })
          found.add(key)
        }
      }
    }

    return uniqueFieldTypes
  })

  const registerField = (
    entity: EntityContext,
    fieldName: string,
    element: HTMLElement,
  ) => {
    const key = `${entity.uuid}:${fieldName}`
    registeredFields[key] = { element, entity, fieldName }
    intersectionObserver.observe(element)
  }

  const updateFieldElement = (
    entity: EntityContext,
    fieldName: string,
    element: HTMLElement,
  ) => {
    const key = `${entity.uuid}:${fieldName}`
    const existingElement = registeredFields[key]?.element
    if (existingElement) {
      intersectionObserver.unobserve(existingElement)
    }
    registeredFields[key] = { entity, fieldName, element }
    intersectionObserver.observe(element)
  }

  const unregisterField = (entity: EntityContext, fieldName: string) => {
    const key = `${entity.uuid}:${fieldName}`
    const el = registeredFields[key]?.element
    if (el) {
      intersectionObserver.unobserve(el)
    }
    visibleFields.delete(key)
    registeredFields[key] = undefined
  }

  function getElementToObserve(
    el: HTMLElement,
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBlockBundle?: BlockBundleWithNested,
  ): HTMLElement {
    // Always observe the root element for proxy blocks.
    if (el.classList.contains('bk-block-proxy')) {
      return el
    }
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
    [...document.querySelectorAll('[data-blokkli-droppable-field]')]
      .filter((el) => {
        // Ignore elements that are rendered inside a field that uses proxy mode, since implementations might use <BlokkliItem> to render blocks in a proxy-mode field.
        return !el.closest('[data-bk-in-proxy="true"]')
      })
      .map(mapDroppableField)

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

  function getUuidsToUpdateRectsFor(): string[] {
    const allUuids = Object.keys(registeredBlocks)

    // Up until a certain amount of blocks, it's still reasonable to call
    // getBoundingClientRect() on a lot of elements. This has the benefit
    // of making sure that the rects are always up to date.
    if (allUuids.length < 150) {
      return allUuids
    }

    // For performance reasons, only update rects for blocks that are
    // currently visible. This will result in weird behaviour, e.g. in the
    // artboard overview or when using Tab to select the next one.
    // However, performance is more important at this point, or else the editor
    // might become too sluggish to actually use.
    return getVisibleBlocks()
  }

  function updateVisibleRects() {
    const toUpdate = getUuidsToUpdateRectsFor()
    const offset = ui.artboardOffset.value
    const scale = ui.artboardScale.value
    for (let i = 0; i < toUpdate.length; i++) {
      const uuid = toUpdate[i]
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
        field.element.getBoundingClientRect(),
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
    updateVisibleRects()
    getVisibleFields().forEach(refreshFieldRect)
    logger.log('Refreshed all visible rects')
  })

  function init() {
    intersectionObserver.init()
    intersectionReady.value = true
    logger.log('IntersectionObserver initialized')
  }

  const dragElementUuidMap = new WeakMap<Node, string>()
  const dragElementCache: Map<string, HTMLElement> = new Map()

  function handleNodeAdded(node: Node) {
    if (!(node instanceof HTMLElement)) {
      return
    }

    if (node.dataset.uuid) {
      const item = buildDraggableItem(node)
      if (item && item.itemType === 'existing') {
        const observableElement = getElementToObserve(
          node,
          item.itemBundle,
          item.hostFieldListType,
          item.hostBundle as BlockBundleWithNested,
        )
        intersectionObserver.observe(observableElement)
        resizeObserver.observe(observableElement)
        registeredBlocks[item.uuid] = node
      }
    } else if (
      node.dataset.fieldName &&
      node.dataset.fieldKey &&
      node.dataset.fieldCardinality
    ) {
      const blocks = node.querySelectorAll('[data-element-type="existing"]')
      for (const block of blocks) {
        handleNodeAdded(block)
      }
    }
  }

  function handleNodeRemoved(node: Node) {
    if (node instanceof HTMLElement && node.dataset.uuid) {
      const uuid = node.dataset.uuid
      const el = registeredBlocks[uuid]
      // The block has already been added before, but the
      if (el !== node) {
        return
      }
      if (el) {
        intersectionObserver.unobserve(el)
        resizeObserver.unobserve(el)
        dragElementUuidMap.delete(el)
      }
      dragElementUuidMap.delete(node)
      dragElementCache.delete(uuid)
      registeredBlocks[uuid] = undefined
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete blockRects[uuid]
      visibleBlocks.delete(uuid)
    }
  }

  // Callback function to execute when mutations are observed
  const mutationObserverCallback = function (mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        for (const node of mutation.removedNodes) {
          handleNodeRemoved(node)
        }

        for (const node of mutation.addedNodes) {
          handleNodeAdded(node)
        }
      }
    }
  }

  const mutationObserver = new MutationObserver(mutationObserverCallback)

  mutationObserver.observe(artboardElement, {
    subtree: true,
    childList: true,
  })

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

  function isBlockVisible(uuid: string): boolean {
    return visibleBlocks.has(uuid)
  }

  return {
    findBlock,
    getAllBlocks,
    findClosestBlock,
    getDropElementMarkup,
    findField,
    getAllDroppableFields,
    findClosestEntityContext,
    getVisibleBlocks,
    getVisibleFields,
    registerField,
    unregisterField,
    updateFieldElement,
    getActiveProviderElement,
    getBlockRects,
    getBlockRect,
    getFieldRect,
    refreshBlockRect,
    isBlockVisible,
    isReady: computed(() => mutationsReady.value && intersectionReady.value),
    init,
    getDragElement,
    updateVisibleRects,
    registeredFieldTypes,
  }
}
