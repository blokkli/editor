<template>
  <div
    @mousedown.capture="onMouseDown"
    @dblclick.capture="onDoubleClick"
    @mouseup="onMouseUp"
    @click.capture="onClick"
  >
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, onBeforeUnmount } from '#imports'
import type { Coord } from '#blokkli/types'
import { buildDraggableItem } from '#blokkli/helpers'

const props = defineProps<{
  useSelection?: boolean
}>()

const { selection, eventBus, dom, keyboard } = useBlokkli()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'action', id: string): void
}>()

const mouseIsDown = ref(false)
const start = ref<Coord>({ x: 0, y: 0 })

const findItemId = (
  e: PointerEvent | MouseEvent | TouchEvent,
): string | undefined => {
  const target = e.target
  if (target instanceof HTMLElement || target instanceof SVGElement) {
    const item = target.closest('[data-sortli-id]')
    if (item instanceof HTMLElement) {
      return item.dataset.sortliId
    }
  }
}

const onClick = (e: MouseEvent) => {
  e.preventDefault()
}

const onMouseMove = (e: MouseEvent) => {
  if (!mouseIsDown.value) {
    window.removeEventListener('mousemove', onMouseMove)
    return
  }
  const uuid = findItemId(e)
  if (!uuid || !e.target) {
    window.removeEventListener('mousemove', onMouseMove)
    return
  }
  const deltaX = Math.abs(start.value.x - e.clientX)
  const deltaY = Math.abs(start.value.y - e.clientY)
  if (deltaX > 3 || deltaY > 3) {
    window.removeEventListener('mousemove', onMouseMove)
    if (props.useSelection) {
      if (!selection.uuids.value.includes(uuid)) {
        eventBus.emit('select:end', [uuid])
      }
      if (!selection.uuids.value.length) {
        return
      }
      eventBus.emit('dragging:start', { items: [...selection.blocks.value] })
      return
    }

    if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
      const closestItem = e.target.closest('[data-sortli-id]')
      if (closestItem) {
        const item = buildDraggableItem(closestItem)
        if (!item) {
          return
        }
        eventBus.emit('dragging:start', { items: [item] })
      }
    }
  }
}

const originatesFromEditable = (e: MouseEvent | TouchEvent) => {
  if (e.target instanceof HTMLElement) {
    const el = e.target.closest('[data-blokkli-editable-field]')
    if (el) {
      return true
    }
  }
}

const onMouseDown = (e: MouseEvent) => {
  const id = findItemId(e)
  if (!id) {
    return
  }
  e.stopPropagation()
  e.preventDefault()

  const fromEditable = originatesFromEditable(e)

  if (selection.editableActive.value && !fromEditable) {
    eventBus.emit('editable:save')
    return
  }

  if (fromEditable) {
    if (
      selection.editableActive.value &&
      e.target instanceof HTMLElement &&
      emitEditableFocus(e.target)
    ) {
      e.stopPropagation()
      return
    }
  }

  start.value.x = e.clientX
  start.value.y = e.clientY
  mouseIsDown.value = true
  window.addEventListener('mousemove', onMouseMove)
}

const onMouseUp = (e: MouseEvent) => {
  window.removeEventListener('mousemove', onMouseMove)
  if (!mouseIsDown.value) {
    return
  }
  mouseIsDown.value = false

  if (selection.editableActive.value) {
    return
  }

  if (!selection.isDragging.value) {
    e.preventDefault()
    e.stopPropagation()
    const id = findItemId(e)
    if (id) {
      emit('select', id)
    }
  }
  eventBus.emit('dragging:end')
}

const emitEditableFocus = (el: HTMLElement): boolean => {
  const fieldName = el.dataset.blokkliEditableField
  if (fieldName) {
    const block = dom.findClosestBlock(el)
    if (block) {
      const argsValue = el.dataset.blokkliEditableFieldConfig
      const args = argsValue ? JSON.parse(argsValue) : undefined
      eventBus.emit('editable:focus', {
        fieldName,
        block,
        element: el,
        args,
      })
      return true
    }
  }

  return false
}

const onDoubleClick = (e: MouseEvent) => {
  if (
    originatesFromEditable(e) &&
    e.target instanceof HTMLElement &&
    !keyboard.isPressingControl.value
  ) {
    if (emitEditableFocus(e.target)) {
      e.stopPropagation()
      return
    }
  }
  const id = findItemId(e)
  if (id) {
    emit('action', id)
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<script lang="ts">
export default {
  name: 'Sortli',
}
</script>
