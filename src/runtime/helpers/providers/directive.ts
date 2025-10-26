import type {
  BlokkliDirectiveType,
  EntityContext,
  Rectangle,
} from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import useDelayedIntersectionObserver from './../composables/useDelayedIntersectionObserver'
import type { UiProvider } from './../uiProvider'
import { onBeforeUnmount } from '#imports'
import onBlokkliEvent from './../composables/onBlokkliEvent'
import { itemEntityType } from '#blokkli-build/config'

type EditableFieldData = EntityContext & {
  key: string
  fieldName: string
  directiveType: BlokkliDirectiveType
}

type DroppableFieldElementData = EditableFieldData & {
  element: HTMLElement
}

type EditableRectangle = Rectangle & { key: string }

export type DirectiveProvider = {
  init: () => void
  registerDirectiveElement: (
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
    type: BlokkliDirectiveType,
  ) => void
  unregisterDirectiveElement: (
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
    type: BlokkliDirectiveType,
  ) => void
  getVisible: (directiveType: BlokkliDirectiveType) => Rectangle[]
  getEditableAtPoint: (x: number, y: number) => EditableFieldData | undefined
  getEditablesForBlock: (uuid: string) => EditableFieldData[]
  getDroppableElements: () => DroppableFieldElementData[]
  findEditableElement: (
    fieldName: string,
    host: EntityContext,
  ) => HTMLElement | undefined
}

export default function (ui: UiProvider): DirectiveProvider {
  let stateReloadTimeout: number | null = null
  const elementMap: WeakMap<HTMLElement, EditableFieldData> = new WeakMap()
  const elements: Map<string, HTMLElement> = new Map()
  const fieldData: Map<string, EditableFieldData> = new Map()
  const rects: Record<string, EditableRectangle> = {}
  const visible: Set<string> = new Set()
  const editablesByUuid: Record<
    string,
    Record<string, EditableFieldData | undefined>
  > = {}

  function getVisible(directiveType: BlokkliDirectiveType) {
    return [...visible.keys()]
      .map((key) => {
        if (key.startsWith(directiveType)) {
          return rects[key]
        }
      })
      .filter(falsy)
  }

  function getEditableKey(
    fieldName: string,
    entity: EntityContext,
    directiveType: BlokkliDirectiveType,
  ): string {
    return `${directiveType}:${entity.type}:${entity.uuid}:${fieldName}`
  }

  function intersectionCallback(entries: IntersectionObserverEntry[]) {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value

    for (const entry of entries) {
      if (entry.target instanceof HTMLElement) {
        const data = elementMap.get(entry.target)
        if (!data) {
          continue
        }

        const key = getEditableKey(data.fieldName, data, data.directiveType)
        const domRect = entry.target.getBoundingClientRect()
        rects[key] ||= {
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          key,
        }

        const newRect = ui.getAbsoluteElementRect(domRect, scale, offset)
        rects[key].width = newRect.width
        rects[key].height = newRect.height
        rects[key].x = newRect.x
        rects[key].y = newRect.y

        if (entry.isIntersecting) {
          visible.add(key)
        } else {
          visible.delete(key)
        }
      }
    }
  }

  const intersectionObserver = useDelayedIntersectionObserver(
    intersectionCallback,
    {
      rootMargin: '400px 0px 400px 0px',
    },
  )

  function registerDirectiveElement(
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
    directiveType: BlokkliDirectiveType,
  ) {
    const key = getEditableKey(fieldName, entity, directiveType)
    const data: EditableFieldData = {
      ...entity,
      fieldName,
      directiveType,
      key,
    }
    elementMap.set(el, data)
    fieldData.set(key, data)
    intersectionObserver.observe(el)
    elements.set(key, el)
    if (directiveType === 'editable' && entity.type === itemEntityType) {
      editablesByUuid[entity.uuid] ||= {}
      editablesByUuid[entity.uuid]![fieldName] = data
    }
  }

  function unregisterDirectiveElement(
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
    directiveType: BlokkliDirectiveType,
  ) {
    const key = getEditableKey(fieldName, entity, directiveType)
    intersectionObserver.unobserve(el)
    elementMap.delete(el)
    fieldData.delete(key)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete rects[key]
    visible.delete(key)
    elements.delete(key)

    if (directiveType === 'editable' && entity.type === itemEntityType) {
      if (editablesByUuid[entity.uuid]) {
        editablesByUuid[entity.uuid]![fieldName] = undefined
      }
    }
  }

  function init() {
    intersectionObserver.init()
  }

  function getEditableAtPoint(
    x: number,
    y: number,
  ): EditableFieldData | undefined {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value

    // Convert screen coordinates to artboard-relative coordinates
    const artboardX = x / scale - offset.x / scale
    const artboardY = y / scale - offset.y / scale

    // Check visible editable fields
    for (const key of visible) {
      if (!key.startsWith('editable:')) continue

      const rect = rects[key]
      if (!rect) continue

      // Check if point is inside this rect
      if (
        artboardX >= rect.x &&
        artboardX <= rect.x + rect.width &&
        artboardY >= rect.y &&
        artboardY <= rect.y + rect.height
      ) {
        return fieldData.get(key)
      }
    }

    return undefined
  }

  function updateRects() {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value

    // Get keys to update: either all fields or just visible ones
    const keysToUpdate =
      elements.size < 150 ? Array.from(elements.keys()) : Array.from(visible)

    // Update rectangles for selected editable fields
    for (let i = 0; i < keysToUpdate.length; i++) {
      const key = keysToUpdate[i]!
      const el = elements.get(key)
      if (!el) continue

      const domRect = el.getBoundingClientRect()
      const newRect = ui.getAbsoluteElementRect(domRect, scale, offset)

      // Update existing rect or create new one
      if (rects[key]) {
        rects[key].width = newRect.width
        rects[key].height = newRect.height
        rects[key].x = newRect.x
        rects[key].y = newRect.y
      } else {
        rects[key] = {
          width: newRect.width,
          height: newRect.height,
          x: newRect.x,
          y: newRect.y,
          key,
        }
      }
    }
  }

  function handleRefresh() {
    if (stateReloadTimeout) {
      window.clearTimeout(stateReloadTimeout)
    }
    if (visible.size < 150) {
      updateRects()
    }

    stateReloadTimeout = window.setTimeout(updateRects, 300)
  }

  function getEditablesForBlock(uuid: string): EditableFieldData[] {
    const editables = editablesByUuid[uuid]
    if (!editables) {
      return []
    }

    return Object.values(editables).filter(falsy)
  }

  function getDroppableElements(): DroppableFieldElementData[] {
    const droppableElements: DroppableFieldElementData[] = []

    for (const item of fieldData.values()) {
      if (item.directiveType !== 'droppable') {
        continue
      }

      const element = elements.get(item.key)
      if (!element) {
        continue
      }

      droppableElements.push({
        ...item,
        element,
      })
    }

    return droppableElements
  }

  function findEditableElement(
    fieldName: string,
    host: EntityContext,
  ): HTMLElement | undefined {
    const key = getEditableKey(fieldName, host, 'editable')
    return elements.get(key)
  }

  onBlokkliEvent('state:reloaded', handleRefresh)
  onBlokkliEvent('ui:resized', handleRefresh)
  onBlokkliEvent('option:finish-change', handleRefresh)

  onBeforeUnmount(() => {
    if (stateReloadTimeout) {
      window.clearTimeout(stateReloadTimeout)
    }
  })

  return {
    registerDirectiveElement,
    unregisterDirectiveElement,
    init,
    getVisible,
    getEditableAtPoint,
    getEditablesForBlock,
    findEditableElement,
    getDroppableElements,
  }
}
