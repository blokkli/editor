<template>
  <TransitionGroup
    ref="list"
    :name="ui.useAnimations.value && !noTransition ? 'bk-sortli' : undefined"
    tag="div"
    @mousedown.prevent.capture="onMouseDown"
    @mouseup.prevent.capture="onMouseUp"
    @click.prevent.capture="onClick"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @before-leave="beforeLeave"
    @leave="onLeave"
  >
    <slot></slot>
  </TransitionGroup>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  onBeforeUnmount,
  ref,
  type ComponentPublicInstance,
} from '#imports'
import type { Coord } from '#blokkli/types'
import { buildDraggableItem } from '#blokkli/helpers'
import { getDefinition } from '#blokkli/definitions'

const props = defineProps<{
  useSelection?: boolean
  noTransition?: boolean
  isNested?: boolean
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
  if (props.isNested) {
    return
  }
  e.stopPropagation()
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
  if (props.isNested) {
    return
  }
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
const onTouchEnd = () => {
  if (props.isNested) {
    return
  }
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
  const target = e.target
  if (!(target instanceof Element)) {
    return
  }

  const tree = e.composedPath() as Element[]

  for (let i = 0; i < tree.length; i++) {
    const el = tree[i]
    if (!(el instanceof HTMLElement)) {
      continue
    }
    const item = buildDraggableItem(el)
    if (item?.itemType === 'existing') {
      const definition = getDefinition(item.itemBundle)
      if (definition?.editor?.getDraggableElement) {
        const draggableElement = definition.editor.getDraggableElement(el)
        if (draggableElement) {
          if (!tree.includes(draggableElement)) {
            continue
          }
        }
      }
    }

    const id = el.dataset.sortliId
    if (!id) {
      continue
    }

    return { id, element: el }
  }
}

const onClick = (e: MouseEvent) => {
  if (props.isNested) {
    return
  }
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

  if (keyboard.isPressingShift.value) {
    eventBus.emit('select:shiftToggle', id)
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
  if (props.isNested) {
    return
  }
  if (isTouching.value) {
    return
  }
  if (e.button !== 0) {
    return
  }
  if (selection.isDragging.value) {
    eventBus.emit('dragging:end')
  }
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

const onMouseUp = () => {
  if (props.isNested) {
    return
  }
  if (isTouching.value) {
    return
  }
  window.removeEventListener('mousemove', onMouseMove)
  start.value.x = 0
  start.value.y = 0

  if (selection.isDragging.value) {
    eventBus.emit('dragging:end')
  }
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
        eventBus.emit('editable:focus', {
          fieldName,
          uuid: block.uuid,
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
