<template>
  <TransitionGroup
    ref="list"
    :name="ui.useAnimations.value ? 'bk-sortli' : undefined"
    tag="div"
    @mousedown.capture="onMouseDown"
    @mouseup="onMouseUp"
    @click.capture="onClick"
    @touchstart.capture="onTouchStart"
    @touchmove.capture="onTouchMove"
    @touchend.capture="onTouchEnd"
    @before-leave="beforeLeave"
    @leave="onLeave"
  >
    <slot></slot>
  </TransitionGroup>
</template>

<script lang="ts" setup>
import { useBlokkli, onBeforeUnmount } from '#imports'
import type { Coord } from '#blokkli/types'
import { buildDraggableItem } from '#blokkli/helpers'

const props = defineProps<{
  useSelection?: boolean
}>()

const { selection, eventBus, dom, keyboard, ui } = useBlokkli()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'action', id: string): void
}>()

const list = ref<ComponentPublicInstance | null>(null)
const mouseIsDown = ref(false)
const start = ref<Coord>({ x: 0, y: 0 })

const isTouching = ref(false)
let touchTimeout: any = null
let touchedId: string | undefined = undefined
let clickStart: number | null = null

const shouldHandleEvent = (e: TouchEvent | MouseEvent) => {
  if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
    if (e.target.closest('.bk-no-drag')) {
      return false
    }
  }

  return true
}

const beforeLeave = (el: Element) => {
  if (!ui.useAnimations.value) {
    return
  }
  if (el instanceof HTMLElement) {
    const animatorId = Math.round(Math.random() * 1000000000000).toString()
    el.dataset.animatorId = animatorId
    eventBus.emit('animator:add', { id: animatorId, mode: 'leave' })
    const rect = el.getBoundingClientRect()
    const computed = getComputedStyle(el)
    const marginTop = parseInt(computed.marginTop.replace('px', ''))
    const marginBottom = parseInt(computed.marginBottom.replace('px', ''))
    el.style.marginBottom = '0px'
    el.style.marginTop = '0px'
    el.style.opacity = '0'
    el.style.paddingTop = '0px'
    el.style.paddingBottom = '0px'
    el.style.overflow = 'hidden'
    el.style.height = rect.height + marginTop + marginBottom + 'px'
  }
}

const onLeave = (el: Element, done: Function) => {
  if (!ui.useAnimations.value) {
    return done()
  }
  if (el instanceof HTMLElement) {
    el.style.height = '0px'
  }
  setTimeout(() => {
    done()
  }, 310)
}

const onTouchStart = (e: TouchEvent) => {
  e.stopPropagation()
  e.preventDefault()
  isTouching.value = true
  clearTimeout(touchTimeout)
  if (!shouldHandleEvent(e)) {
    return
  }
  if (!props.useSelection) {
    return
  }
  if (selection.isDragging.value) {
    return
  }
  const currentTouchedId = findItem(e)?.id
  touchedId = currentTouchedId
  if (!touchedId || !currentTouchedId) {
    return
  }
  const touch = e.touches[0]
  start.value.x = touch.clientX
  start.value.y = touch.clientY

  touchTimeout = setTimeout(() => {
    if (selection.isDragging.value) {
      return
    }
    if (!list.value || !touchedId) {
      return
    }

    // Long press on an additional item.
    if (
      !selection.uuids.value.includes(currentTouchedId) &&
      selection.uuids.value.length
    ) {
      if (!selection.isMultiSelecting.value) {
        eventBus.emit('select:start', [
          ...selection.uuids.value,
          currentTouchedId,
        ])
      }
      return
    }
    if (!selection.isMultiSelecting.value && !selection.uuids.value.length) {
      eventBus.emit('select', currentTouchedId)
    }
    eventBus.emit('dragging:start', {
      items: [...selection.blocks.value],
      coords: start.value,
      mode: isTouching.value ? 'touch' : 'mouse',
    })
  }, 300)
}

const onTouchMove = (e: TouchEvent) => {
  if (!props.useSelection) {
    return
  }
  const touch = e.touches[0]

  const diffX = Math.abs(start.value.x - touch.clientX)
  const diffY = Math.abs(start.value.y - touch.clientY)

  if (diffX > 3 || diffY > 5) {
    clearTimeout(touchTimeout)
  }
}
const onTouchEnd = (e: TouchEvent) => {
  if (!props.useSelection) {
    return
  }
  clearTimeout(touchTimeout)
}

type FoundItem = {
  id: string
  element: HTMLElement
}

const findItem = (
  e: PointerEvent | MouseEvent | TouchEvent,
): FoundItem | undefined => {
  if (!list.value) {
    return
  }

  const target = e.target
  if (!(target instanceof HTMLElement || target instanceof SVGElement)) {
    return
  }

  const item = target.closest('[data-sortli-id]')
  if (!(item instanceof HTMLElement)) {
    return
  }

  const id = item.dataset.sortliId
  if (!id) {
    return
  }

  const el = list.value.$el.querySelector(`[data-sortli-id="${id}"]`)
  if (!(el instanceof HTMLElement)) {
    return
  }

  return { id, element: el }
}

const onClick = (e: MouseEvent) => {
  if (!shouldHandleEvent(e)) {
    return
  }
  e.preventDefault()
  e.stopPropagation()

  if (selection.isDragging.value) {
    // eventBus.emit('dragging:end')
    return
  }

  // Chrome on Android doesn't support the dblclick event, so we have to reimplement it.
  if (clickStart !== null) {
    const now = Date.now()
    if (now - clickStart < 200) {
      e.preventDefault()
      onDoubleClick(e)
      clickStart = null
      return
    }
  }
  clickStart = Date.now()

  if (!props.useSelection && isTouching.value) {
    const el = findItem(e)?.element
    if (!el) {
      return
    }
    const item = buildDraggableItem(el)
    if (!item) {
      return
    }
    eventBus.emit('dragging:start', {
      items: [item],
      coords: start.value,
      mode: isTouching.value ? 'touch' : 'mouse',
    })
    return
  }
  const id = findItem(e)?.id
  if (!id) {
    return
  }

  if (
    (selection.uuids.value.includes(id) &&
      selection.uuids.value.length === 1) ||
    selection.isMultiSelecting.value ||
    keyboard.isPressingControl.value
  ) {
    eventBus.emit('select:toggle', id)
  } else {
    eventBus.emit('select', id)
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (!mouseIsDown.value) {
    window.removeEventListener('mousemove', onMouseMove)
    return
  }
  if (isTouching.value) {
    return
  }
  const uuid = findItem(e)?.id
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
      eventBus.emit('dragging:start', {
        items: [...selection.blocks.value],
        coords: start.value,
        mode: isTouching.value ? 'touch' : 'mouse',
      })
      return
    }

    if (e.target instanceof HTMLElement || e.target instanceof SVGElement) {
      const closestItem = e.target.closest('[data-sortli-id]')
      if (closestItem) {
        const item = buildDraggableItem(closestItem)
        if (!item) {
          return
        }
        eventBus.emit('dragging:start', {
          items: [item],
          coords: start.value,
          mode: isTouching.value ? 'touch' : 'mouse',
        })
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
  if (isTouching.value) {
    return
  }
  if (e.button !== 0) {
    return
  }
  console.log('mouse down')
  eventBus.emit('dragging:end')
  start.value.x = 0
  start.value.y = 0
  if (isTouching.value) {
    return
  }

  const id = findItem(e)?.id
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
  if (isTouching.value) {
    return
  }
  console.log('Mouse up')
  window.removeEventListener('mousemove', onMouseMove)
  start.value.x = 0
  start.value.y = 0

  eventBus.emit('dragging:end')
  if (isTouching.value) {
    return
  }
  if (!mouseIsDown.value) {
    return
  }
  mouseIsDown.value = false

  if (selection.editableActive.value) {
    return
  }
}

const emitEditableFocus = (eventTarget: HTMLElement): boolean => {
  const el = eventTarget.closest('[data-blokkli-editable-field]')
  if (el instanceof HTMLElement) {
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
  }

  return false
}

const onDoubleClick = (e: MouseEvent | TouchEvent) => {
  if (selection.isMultiSelecting.value) {
    e.stopPropagation()
    e.preventDefault()
    return
  }
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
  const id = findItem(e)?.id
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
