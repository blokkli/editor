import type { EntityContext, Rectangle } from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import useDelayedIntersectionObserver from './composables/useDelayedIntersectionObserver'
import type { UiProvider } from './uiProvider'
import { onBeforeUnmount } from '#imports'
import onBlokkliEvent from './composables/onBlokkliEvent'

type EditableFieldData = EntityContext & {
  fieldName: string
}

type EditableRectangle = Rectangle & { key: string }

export type EditableProvider = {
  init: () => void
  registerEditableField: (
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
  ) => void
  unregisterEditableField: (
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
  ) => void
  getVisible: () => Rectangle[]
  getEditableAtPoint: (x: number, y: number) => EditableFieldData | undefined
}

export default function (ui: UiProvider): EditableProvider {
  let stateReloadTimeout: number | null = null
  const editableFieldElementMap: WeakMap<HTMLElement, EditableFieldData> =
    new WeakMap()
  const editableFieldElements: Map<string, HTMLElement> = new Map()
  const editableFieldData: Map<string, EditableFieldData> = new Map()
  const rects: Record<string, EditableRectangle> = {}
  const visible: Set<string> = new Set()

  function getVisible() {
    return [...visible.keys()]
      .map((key) => {
        return rects[key]
      })
      .filter(falsy)
  }

  function getEditableKey(fieldName: string, entity: EntityContext): string {
    return `${entity.type}:${entity.uuid}:${fieldName}`
  }

  function intersectionCallback(entries: IntersectionObserverEntry[]) {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value

    for (const entry of entries) {
      if (entry.target instanceof HTMLElement) {
        const data = editableFieldElementMap.get(entry.target)
        if (!data) {
          continue
        }

        const key = getEditableKey(data.fieldName, data)
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

  function registerEditableField(
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
  ) {
    const key = getEditableKey(fieldName, entity)
    const data: EditableFieldData = {
      ...entity,
      fieldName,
    }
    editableFieldElementMap.set(el, data)
    editableFieldData.set(key, data)
    intersectionObserver.observe(el)
    editableFieldElements.set(key, el)
  }

  function unregisterEditableField(
    el: HTMLElement,
    fieldName: string,
    entity: EntityContext,
  ) {
    const key = getEditableKey(fieldName, entity)
    intersectionObserver.unobserve(el)
    editableFieldElementMap.delete(el)
    editableFieldData.delete(key)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete rects[key]
    visible.delete(key)
    editableFieldElements.delete(key)
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
      const rect = rects[key]
      if (!rect) continue

      // Check if point is inside this rect
      if (
        artboardX >= rect.x &&
        artboardX <= rect.x + rect.width &&
        artboardY >= rect.y &&
        artboardY <= rect.y + rect.height
      ) {
        return editableFieldData.get(key)
      }
    }

    return undefined
  }

  function updateRects() {
    const scale = ui.artboardScale.value
    const offset = ui.artboardOffset.value

    // Get keys to update: either all fields or just visible ones
    const keysToUpdate =
      editableFieldElements.size < 150
        ? Array.from(editableFieldElements.keys())
        : Array.from(visible)

    // Update rectangles for selected editable fields
    for (let i = 0; i < keysToUpdate.length; i++) {
      const key = keysToUpdate[i]!
      const el = editableFieldElements.get(key)
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

  onBlokkliEvent('state:reloaded', handleRefresh)
  onBlokkliEvent('ui:resized', handleRefresh)

  onBeforeUnmount(() => {
    if (stateReloadTimeout) {
      window.clearTimeout(stateReloadTimeout)
    }
  })

  return {
    registerEditableField,
    unregisterEditableField,
    init,
    getVisible,
    getEditableAtPoint,
  }
}
