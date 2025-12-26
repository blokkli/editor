import { reactive, ref, computed, type ComputedRef, onMounted } from '#imports'
import type {
  DraggableExistingBlock,
  DraggableItem,
  EntityContext,
  Rectangle,
  Coord,
  RenderedFieldListItem,
  RegisteredField,
  RegisterFieldData,
} from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import type { UiProvider } from './ui'
import { cloneElementWithStyles } from '../dom'
import {
  onBlokkliEvent,
  useDelayedIntersectionObserver,
} from '#blokkli/editor/composables'
import type { DebugProvider } from './debug'
import type { StateProvider } from './state'
import type { ElementProvider } from './element'

type RegisteredFieldType = {
  entityType: string
  entityBundle: string
  fieldName: string
}

type MeasuredBlockRect = Rectangle & { time: number }

export type DomProvider = {
  /**
   * Get the bounding client rect for an element.
   *
   * Wrapper around `getBoundingClientRect()` with debug logging.
   */
  getBoundingClientRect: (element: HTMLElement) => DOMRect

  /**
   * Return the droppable markup for a draggable item.
   */
  getDropElementMarkup(
    item: DraggableItem | RenderedFieldListItem,
    checkSize?: boolean,
  ): string

  /**
   * Register a block element for observation and tracking.
   *
   * Starts observing the element with IntersectionObserver and ResizeObserver
   * to track visibility and dimensions.
   *
   * @param key - Unique key identifying the block's location (field + index)
   * @param uuid - The block's UUID
   * @param el - The block's root HTML element
   */
  registerBlock: (key: string, uuid: string, el: HTMLElement | null) => void

  /**
   * Unregister a block element from observation.
   *
   * Stops observing the element and removes it from tracking.
   *
   * @param key - Unique key identifying the block's location
   * @param uuid - The block's UUID
   */
  unregisterBlock: (key: string, uuid: string) => void

  /**
   * Register a field element for observation.
   *
   * Starts observing the field element with IntersectionObserver to track
   * visibility and position.
   *
   * @param entity - The entity context (UUID, type, bundle)
   * @param fieldName - The field's machine name
   * @param instance - The field's HTML element
   * @param data - Additional field registration data
   */
  registerField: (
    entity: EntityContext,
    fieldName: string,
    instance: HTMLElement,
    data: RegisterFieldData,
  ) => void

  /**
   * Update the element reference for an already registered field.
   *
   * Stops observing the old element and starts observing the new one.
   *
   * @param entity - The entity context
   * @param fieldName - The field's machine name
   * @param element - The new field HTML element
   * @param data - Additional field registration data
   */
  updateFieldElement: (
    entity: EntityContext,
    fieldName: string,
    element: HTMLElement,
    data: RegisterFieldData,
  ) => void

  /**
   * Unregister a field element from observation.
   *
   * @param entity - The entity context
   * @param fieldName - The field's machine name
   */
  unregisterField: (entity: EntityContext, fieldName: string) => void

  /**
   * Get a registered field by entity UUID and field name.
   *
   * @param uuid - The entity UUID
   * @param fieldName - The field's machine name
   * @returns The registered field data, or undefined if not found
   */
  getRegisteredField: (
    uuid: string,
    fieldName: string,
  ) => RegisteredField | undefined

  /**
   * List of unique field types currently registered.
   *
   * Returns unique combinations of entity type, bundle, and field name.
   */
  registeredFieldTypes: ComputedRef<RegisteredFieldType[]>

  /**
   * List of UUIDs for all blocks with registered elements.
   *
   * Only includes blocks that have a valid HTML element reference.
   */
  registeredBlockUuids: ComputedRef<string[]>

  /**
   * Get UUIDs of all currently visible blocks.
   *
   * @returns Array of block UUIDs that are currently in the viewport
   */
  getVisibleBlocks(): string[]

  /**
   * Get keys of all currently visible fields.
   *
   * @returns Array of field keys (uuid:fieldName) that are currently in the viewport
   */
  getVisibleFields(): string[]

  /**
   * Check if a block is currently visible in the viewport.
   *
   * @param uuid - The block's UUID
   * @returns True if the block is visible
   */
  isBlockVisible(uuid: string): boolean

  /**
   * Get rectangles for all registered blocks.
   *
   * @returns Record mapping UUIDs to their measured rectangles with timestamps
   */
  getBlockRects: () => Record<string, MeasuredBlockRect | undefined>

  /**
   * Get the rectangle for a specific block.
   *
   * @param uuid - The block's UUID
   * @param refresh - Whether to refresh the rect before returning
   * @returns The block's rectangle, or undefined if not found
   */
  getBlockRect: (
    uuid: string,
    refresh?: boolean,
  ) => MeasuredBlockRect | undefined

  /**
   * Refresh the cached rectangle for a specific block.
   *
   * Recalculates the block's position and dimensions immediately.
   *
   * @param uuid - The block's UUID
   */
  refreshBlockRect: (uuid: string) => void

  /**
   * Get the rectangle for a specific field.
   *
   * @param key - The field key (uuid:fieldName)
   * @returns The field's rectangle, or undefined if not found
   */
  getFieldRect: (key: string) => Rectangle | undefined

  /**
   * Record of all registered block elements.
   *
   * Maps UUIDs to their corresponding HTML elements.
   */
  registeredBlocks: ComputedRef<Record<string, HTMLElement | undefined>>

  /**
   * Update rectangles for all visible blocks and fields.
   *
   * Recalculates positions and dimensions for currently visible items.
   * For performance, only updates visible items when there are many blocks.
   */
  updateVisibleRects: () => void

  /**
   * Whether the DOM provider is ready.
   *
   * Ready when IntersectionObserver is initialized and initial measurements are complete.
   */
  isReady: ComputedRef<boolean>

  /**
   * Settlement key that increments after DOM changes settle.
   *
   * Useful for triggering reactivity after blocks/fields are registered/unregistered.
   */
  settleKey: ComputedRef<number>

  /**
   * Initialize the DOM provider.
   *
   * Starts the IntersectionObserver and marks the provider as ready.
   */
  init: () => void

  /**
   * Get the drag element for a block.
   */
  getDragElement: (
    block: DraggableExistingBlock | RenderedFieldListItem,
  ) => HTMLElement | undefined

  /**
   * Get debug data for troubleshooting.
   */
  getDebugData: () => {
    registeredBlocks: Array<{
      uuid: string
      hasElement: boolean
      hasObservedElement: boolean
      hasRect: boolean
      hasCurrentKey: boolean
      isVisible: boolean
      elementInfo?: {
        tagName: string
        bundle?: string
        hostBundle?: string
        fieldListType?: string
      }
    }>
    fields: Array<{
      key: string
      isVisible: boolean
      hasRect: boolean
      entityType: string
      entityBundle: string
      fieldName: string
    }>
    summary: {
      totalRegisteredBlocks: number
      totalBlocksWithElements: number
      totalObservedElements: number
      totalBlockRects: number
      totalVisibleBlocks: number
      totalRegisteredFields: number
      totalVisibleFields: number
      totalFieldRects: number
      isInitializing: boolean
      isReady: boolean
    }
    orphanedData: {
      rectsWithoutRegistration: string[]
      observedElementsWithoutRegistration: string[]
      keysWithoutRegistration: string[]
    }
  }
}

function rectWithTime(rect: Rectangle, time?: number): MeasuredBlockRect {
  return {
    ...rect,
    time: time || performance.now(),
  }
}

export default function (
  ui: UiProvider,
  debug: DebugProvider,
  state: StateProvider,
  element: ElementProvider,
): DomProvider {
  const logger = debug.createLogger('DomProvider')
  const mutationsReady = ref(true)
  const intersectionReady = ref(false)
  const registeredBlocks = reactive<Record<string, HTMLElement | undefined>>({})
  const registeredFields = reactive<
    Record<string, RegisteredField | undefined>
  >({})
  const visibleBlocks: Set<string> = new Set()
  const visibleFields: Set<string> = new Set()
  const fieldElementToFieldKey = new WeakMap<HTMLElement, string>()
  const blockElementToUuid = new WeakMap<HTMLElement, string>()
  const blockRects: Record<string, MeasuredBlockRect | undefined> = {}
  const fieldRects: Record<string, Rectangle> = {}
  const blockUuidCurrentKey: Record<string, string | undefined> = {}
  let initTimeout: null | number = null
  const isInitalizing = ref(true)

  let settleTimeout: null | number = null
  const settleKey = ref(0)

  /**
   * Obserable elements.
   */
  const observedElements: Record<string, HTMLElement | undefined> = {}

  function getBoundingClientRect(element: HTMLElement): DOMRect {
    logger.log('getBoundingClientRect', element)
    return element.getBoundingClientRect()
  }

  const registeredBlockUuids = computed(() => {
    return Object.entries(registeredBlocks)
      .map(([uuid, element]) => {
        if (element) {
          return uuid
        }

        return null
      })
      .filter(falsy)
  })

  const resizeObserver = new ResizeObserver(function (
    entries: ResizeObserverEntry[],
  ) {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) {
        return
      }

      const uuid = blockElementToUuid.get(entry.target)

      if (!uuid) {
        return
      }

      // Skip if block is no longer registered (prevents race condition with unregisterBlock)
      if (!registeredBlocks[uuid]) {
        continue
      }

      const currentRect = blockRects[uuid]

      const now = performance.now()

      if (!currentRect) {
        blockRects[uuid] = rectWithTime(
          {
            x: entry.contentRect.x,
            y: entry.contentRect.y,
            width: entry.borderBoxSize[0]!.inlineSize,
            height: entry.borderBoxSize[0]!.blockSize,
          },
          now,
        )
        return
      }

      if (currentRect.time > now) {
        return
      }

      blockRects[uuid]!.width = entry.borderBoxSize[0]!.inlineSize
      blockRects[uuid]!.height = entry.borderBoxSize[0]!.blockSize
      blockRects[uuid]!.time = now
    }
  })

  function intersectionCallback(entries: IntersectionObserverEntry[]) {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) {
        continue
      }
      const fieldKey = fieldElementToFieldKey.get(entry.target)

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
        continue
      }

      const uuid = blockElementToUuid.get(entry.target)

      if (!uuid) {
        continue
      }
      // Skip if block is no longer registered (prevents race condition with unregisterBlock)
      if (!registeredBlocks[uuid]) {
        continue
      }

      const newRect = ui.getAbsoluteElementRect(rect, scale, offset)
      const currentRect = blockRects[uuid]!

      // Rect already exists.
      if (currentRect) {
        // The time of the rect is larger than the time of the entry.
        // This indicates that the resize observer has already updated the width and/or height.
        // We only need to update the X and Y coordinates.
        if (currentRect.time > entry.time) {
          blockRects[uuid]!.x = newRect.x
          blockRects[uuid]!.y = newRect.y
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

  const intersectionObserver = useDelayedIntersectionObserver(
    intersectionCallback,
    {
      rootMargin: '400px 0px 400px 0px',
    },
  )

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
    data: RegisterFieldData,
  ) => {
    const key = `${entity.uuid}:${fieldName}`
    registeredFields[key] = {
      element,
      entity,
      fieldName,
      ...data,
    }
    intersectionObserver.observe(element)
    fieldElementToFieldKey.set(element, key)
    doInitTimeout()
    doSettleTimeout()
  }

  const updateFieldElement = (
    entity: EntityContext,
    fieldName: string,
    element: HTMLElement,
    data: RegisterFieldData,
  ) => {
    const key = `${entity.uuid}:${fieldName}`
    const existingElement = registeredFields[key]?.element
    if (existingElement) {
      intersectionObserver.unobserve(existingElement)
    }
    registeredFields[key] = {
      entity,
      fieldName,
      element,
      ...data,
    }
    fieldElementToFieldKey.set(element, key)
    intersectionObserver.observe(element)
  }

  const unregisterField = (entity: EntityContext, fieldName: string) => {
    const key = `${entity.uuid}:${fieldName}`
    const el = registeredFields[key]?.element
    if (el) {
      intersectionObserver.unobserve(el)
      fieldElementToFieldKey.delete(el)
    }
    visibleFields.delete(key)
    registeredFields[key] = undefined
    doSettleTimeout()
  }

  const getRegisteredField = (
    uuid: string,
    fieldName: string,
  ): RegisteredField | undefined => {
    const key = `${uuid}:${fieldName}`
    return registeredFields[key]
  }

  const getDropElementMarkup = (
    item: DraggableItem | RenderedFieldListItem,
    checkSize?: boolean,
  ): string => {
    const getElement = () => {
      if ('itemType' in item) {
        if (item.itemType === 'existing') {
          return getDragElement(item)
        }
        return item.element()
      }

      return getDragElement(item)
    }
    const el = getElement()
    if (!el) {
      return ''
    }
    if ('itemType' in item && item.itemType !== 'existing_structure') {
      return el.outerHTML
    }
    const childCount = element.queryAll(
      el,
      '*',
      'Get child count for drop element markup.',
    ).length
    if (checkSize && childCount > 80) {
      return ''
    }
    return cloneElementWithStyles(el, true).replace(/\sdata-\w+="[^"]*"/g, '')
  }

  const getVisibleBlocks = () => Array.from(visibleBlocks)
  const getVisibleFields = () => Array.from(visibleFields)

  function getBlockRects(): Record<string, MeasuredBlockRect | undefined> {
    return blockRects
  }

  function getBlockRect(
    uuid: string,
    refresh?: boolean,
  ): MeasuredBlockRect | undefined {
    if (refresh) {
      refreshBlockRect(uuid)
    }
    return blockRects[uuid]
  }

  function getFieldRect(key: string): Rectangle | undefined {
    return fieldRects[key]
  }

  function refreshBlockRect(
    uuid: string,
    providedOffset?: Coord,
    providedScale?: number,
  ) {
    const offset = providedOffset ?? ui.artboardOffset.value
    const scale = providedScale ?? ui.artboardScale.value
    const el = registeredBlocks[uuid]
    if (!el) {
      return
    }

    const item = state.getFieldListItem(uuid)
    if (!item) {
      return
    }

    const fieldList = state.getFieldListForBlock(item.uuid)
    if (!fieldList) {
      return
    }

    blockRects[uuid] = rectWithTime(
      ui.getAbsoluteElementRect(el.getBoundingClientRect(), scale, offset),
    )
  }

  function refreshFieldRect(key: string) {
    const el = registeredFields[key]?.element
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
    logger.log('Update visible rects')
    const toUpdate = getUuidsToUpdateRectsFor()
    const offset = ui.artboardOffset.value
    const scale = ui.artboardScale.value
    for (let i = 0; i < toUpdate.length; i++) {
      const uuid = toUpdate[i]
      if (uuid) {
        refreshBlockRect(uuid, offset, scale)
      }
    }

    const visibleFieldKeys = getVisibleFields()
    for (let i = 0; i < visibleFieldKeys.length; i++) {
      const key = visibleFieldKeys[i]!
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
    if (stateReloadTimeout) {
      window.clearTimeout(stateReloadTimeout)
    }

    const allUuids = Object.keys(registeredBlocks)
    if (allUuids.length < 150) {
      // Immediately update all rects if we have less than 150 blocks.
      // In this case it's fine to do this, performance-wise.
      updateVisibleRects()
    }

    stateReloadTimeout = window.setTimeout(updateVisibleRects, 300)
    doSettleTimeout()
  })

  function forceRefresh() {
    updateVisibleRects()
    getVisibleFields().forEach(refreshFieldRect)
    logger.log('Refreshed all visible rects')
  }

  onBlokkliEvent('option:finish-change', forceRefresh)
  onBlokkliEvent('ui:resized', forceRefresh)

  function init() {
    intersectionObserver.init()
    intersectionReady.value = true
    logger.log('IntersectionObserver initialized')
  }

  const dragElementUuidMap = new WeakMap<Node, string>()
  const dragElementCache: Map<string, HTMLElement> = new Map()

  function getDragElement(
    block: DraggableExistingBlock | RenderedFieldListItem,
  ) {
    const item = 'itemType' in block ? block.block : block
    if (!item) {
      return
    }
    return registeredBlocks[item.uuid]
  }

  function isBlockVisible(uuid: string): boolean {
    return visibleBlocks.has(uuid)
  }

  function refreshAllBlockRects() {
    const uuids = Object.keys(blockRects)
    if (uuids.length < 200) {
      for (let i = 0; i < uuids.length; i++) {
        const uuid = uuids[i]
        if (!uuid) {
          continue
        }

        refreshBlockRect(uuid)
      }
    }
  }

  function doInitTimeout() {
    if (initTimeout) {
      window.clearTimeout(initTimeout)
    }

    if (isInitalizing.value) {
      initTimeout = window.setTimeout(() => {
        isInitalizing.value = false
        refreshAllBlockRects()
      }, 500)
    }
  }

  function doSettleTimeout() {
    if (settleTimeout) {
      window.clearTimeout(settleTimeout)
    }

    settleTimeout = window.setTimeout(() => {
      settleKey.value++
    }, 50)
  }

  function registerBlock(key: string, uuid: string, el: HTMLElement | null) {
    logger.log('registerBlock: ' + uuid)

    blockUuidCurrentKey[uuid] = key

    doInitTimeout()
    doSettleTimeout()

    // No root node found on the block, unregister it.
    if (!(el instanceof HTMLElement)) {
      logger.log('registerBlock call unregisterBlock because no element', uuid)
      unregisterBlock(key, uuid)
      return
    }

    // Block is already registered, but the element has been updated.
    if (registeredBlocks[uuid]) {
      logger.log(
        'registerBlock call unregisterBlock because already registered',
        uuid,
      )
      unregisterBlock(key, uuid)
    }

    const item = state.getFieldListItem(uuid)
    if (!item) {
      return logger.error(
        'Failed to register block due to missing field list item.',
        uuid,
      )
    }
    const fieldList = state.getFieldListForBlock(item.uuid)
    if (!fieldList) {
      return logger.error(
        'Failed to register block due to missing field list.',
        uuid,
      )
    }

    blockElementToUuid.set(el, uuid)
    registeredBlocks[uuid] = el
    observedElements[uuid] = el
    intersectionObserver.observe(el)
    resizeObserver.observe(el)
  }

  function unregisterBlock(key: string, uuid: string) {
    const currentKey = blockUuidCurrentKey[uuid]

    // This indicates that unregisterBlock was called *after* registerBlock,
    // for example when a block was moved from one field to another.
    // In such a case, the "new" location of the block calls registerBlock and
    // the "old" location calls unregisterBlock. We would be immediately removing
    // the block again.
    // The key is unique by "location" basically, so we can use it to prevent
    // this from happening.
    if (currentKey && currentKey !== key) {
      return
    }

    doSettleTimeout()

    logger.log('unregisterBlock: ' + uuid)

    const el = registeredBlocks[uuid]
    const observedElement = observedElements[uuid]

    // Unobserve the correct element (the one that was actually observed)
    if (observedElement) {
      intersectionObserver.unobserve(observedElement)
      resizeObserver.unobserve(observedElement)

      observedElements[uuid] = undefined
      blockElementToUuid.delete(observedElement)
    }

    if (el) {
      dragElementUuidMap.delete(el)
    }
    dragElementCache.delete(uuid)
    registeredBlocks[uuid] = undefined
    blockRects[uuid] = undefined
    blockUuidCurrentKey[uuid] = undefined
    visibleBlocks.delete(uuid)
  }

  function getDebugData() {
    // Collect all unique UUIDs from all sources
    const allUuids = new Set<string>([
      ...Object.keys(registeredBlocks),
      ...Object.keys(blockRects),
      ...Object.keys(observedElements),
      ...Object.keys(blockUuidCurrentKey),
    ])

    // Build detailed block info
    const blocksInfo = Array.from(allUuids).map((uuid) => {
      const el = registeredBlocks[uuid]
      return {
        uuid,
        hasElement: !!el,
        hasObservedElement: !!observedElements[uuid],
        hasRect: !!blockRects[uuid],
        hasCurrentKey: !!blockUuidCurrentKey[uuid],
        isVisible: visibleBlocks.has(uuid),
        elementInfo: el
          ? {
              tagName: el.tagName,
              bundle: el.dataset.itemBundle,
              hostBundle: el.dataset.hostBundle,
              fieldListType: el.dataset.hostFieldListType,
            }
          : undefined,
      }
    })

    // Build field info
    const fieldsInfo = Object.entries(registeredFields)
      .filter(([, field]) => !!field)
      .map(([key, field]) => ({
        key,
        isVisible: visibleFields.has(key),
        hasRect: !!fieldRects[key],
        entityType: field!.entity.type,
        entityBundle: field!.entity.bundle,
        fieldName: field!.fieldName,
      }))

    // Find orphaned data (data without corresponding registration)
    const registeredUuids = new Set(
      Object.entries(registeredBlocks)
        .filter(([, el]) => !!el)
        .map(([uuid]) => uuid),
    )

    const rectsWithoutRegistration = Object.keys(blockRects).filter(
      (uuid) => !registeredUuids.has(uuid),
    )

    const observedElementsWithoutRegistration = Object.keys(
      observedElements,
    ).filter((uuid) => !registeredUuids.has(uuid))

    const keysWithoutRegistration = Object.keys(blockUuidCurrentKey).filter(
      (uuid) => !registeredUuids.has(uuid),
    )

    return {
      registeredBlocks: blocksInfo,
      fields: fieldsInfo,
      summary: {
        totalRegisteredBlocks: Object.keys(registeredBlocks).length,
        totalBlocksWithElements: Object.values(registeredBlocks).filter(
          (el) => !!el,
        ).length,
        totalObservedElements: Object.keys(observedElements).length,
        totalBlockRects: Object.keys(blockRects).length,
        totalVisibleBlocks: visibleBlocks.size,
        totalRegisteredFields: Object.values(registeredFields).filter(
          (f) => !!f,
        ).length,
        totalVisibleFields: visibleFields.size,
        totalFieldRects: Object.keys(fieldRects).length,
        isInitializing: isInitalizing.value,
        isReady:
          mutationsReady.value &&
          intersectionReady.value &&
          !isInitalizing.value,
      },
      orphanedData: {
        rectsWithoutRegistration,
        observedElementsWithoutRegistration,
        keysWithoutRegistration,
      },
    }
  }

  onMounted(() => {
    doInitTimeout()
  })

  return {
    getDropElementMarkup,
    getVisibleBlocks,
    getVisibleFields,
    registerField,
    unregisterField,
    updateFieldElement,
    getBlockRects,
    getBlockRect,
    getFieldRect,
    refreshBlockRect,
    isBlockVisible,
    isReady: computed(
      () =>
        mutationsReady.value && intersectionReady.value && !isInitalizing.value,
    ),
    settleKey: computed(() => settleKey.value),
    init,
    getDragElement,
    updateVisibleRects,
    registeredFieldTypes,
    registerBlock,
    unregisterBlock,
    registeredBlockUuids,
    getDebugData,
    getRegisteredField,
    registeredBlocks: computed(() => registeredBlocks),
    getBoundingClientRect,
  }
}
