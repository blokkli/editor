<template>
  <Teleport to="body">
    <div class="pb pb-multi-select" v-if="isSelecting">
      <svg
        class="pb-multi-select-area"
        v-bind="style"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          :width="selectRect.width"
          :height="selectRect.height"
          :x="selectRect.x"
          :y="selectRect.y"
          :style="{ animationDuration }"
        />
      </svg>

      <Item
        v-if="isSelecting"
        v-for="item in actuallySelectable"
        :rect="item.rect"
        :select-rect="selectRect"
        :is-intersecting="intersects(selectRect, item.rect)"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { eventBus } from '../../eventBus'
import { buildDraggableItem, falsy, findParagraphElement } from '../../helpers'
import {
  AnimationFrameEvent,
  DraggableExistingParagraphItem,
} from '../../types'
import type { Rectangle } from './Item/index.vue'
import Item from './Item/index.vue'
import { Sortable } from './../../sortable'

const { isPressingControl } = useParagraphsBuilderStore()

export type SelectableElement = {
  item: DraggableExistingParagraphItem
  nested: boolean
  rect: Rectangle
}

const isSelecting = ref(false)
const downX = ref(0)
const downY = ref(0)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)
const selectable = ref<SelectableElement[]>([])
const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)

const actuallySelectable = computed(() => {
  return selectable.value.filter((v) => {
    if (isPressingControl.value) {
      return v.nested
    } else {
      return !v.nested
    }
  })
})

const animationDuration = computed(() => {
  const perimeter = 2 * (selectRect.value.width + selectRect.value.height)
  const animationDuration = 200 - perimeter / 100
  return animationDuration + 'ms'
})

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

const selectRect = computed<Rectangle>(() => {
  const ax = startX.value > currentX.value ? currentX.value : startX.value
  const ay = startY.value > currentY.value ? currentY.value : startY.value
  const bx = startX.value > currentX.value ? startX.value : currentX.value
  const by = startY.value > currentY.value ? startY.value : currentY.value
  return {
    x: ax,
    y: ay,
    width: bx - ax,
    height: by - ay,
  }
})

const style = computed(() => {
  return {
    width: viewportWidth.value,
    height: viewportHeight.value,
    viewBox: `0 0 ${Math.round(viewportWidth.value)} ${Math.round(
      viewportHeight.value,
    )}`,
  }
})

function getSelectableElements(): SelectableElement[] {
  return [...document.querySelectorAll('[data-element-type="existing"]')]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const item = buildDraggableItem(el)
        if (item && item.itemType === 'existing') {
          const rect = el.getBoundingClientRect()
          const y = rect.top + document.documentElement.scrollTop
          return {
            item: item,
            nested: el.dataset.isNested === 'true',
            rect: {
              x: rect.left,
              y,
              width: rect.width,
              height: rect.height,
            },
          }
        }
      }
      return null
    })
    .filter(falsy)
}

function shouldStartMultiSelect(target: Element): boolean {
  const isInsideParagraph = !!target.closest('.draggable')
  if (isInsideParagraph) {
    return false
  }
  const isInsideControl = !!target.closest('.pb-control')
  if (isInsideControl) {
    return false
  }

  const isInSidebar = !!target.closest('.pb-sidebar')
  if (isInSidebar) {
    return false
  }

  return true
}

function onWindowMouseMove(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  if (!isSelecting.value) {
    const diffX = Math.abs(downX.value - e.x)
    const diffY = Math.abs(downY.value - e.y)
    if (diffX > 3 || diffY > 3) {
      eventBus.emit('select:start')
      const newX = e.x + window.scrollX
      const newY = e.y + window.scrollY
      startX.value = newX
      startY.value = newY
      currentX.value = newX
      currentY.value = newY
      selectable.value = getSelectableElements()
      isSelecting.value = true
    }
  }
  currentX.value = e.x + window.scrollX
  currentY.value = e.y + window.scrollY
}

function onWindowMouseUp(e: MouseEvent) {
  window.removeEventListener('mousemove', onWindowMouseMove)

  if (!isSelecting.value) {
    selectable.value = []
    return
  }

  isSelecting.value = false

  if (isSelecting.value) {
    e.preventDefault()
    e.stopPropagation()
  }

  const selected = actuallySelectable.value.filter((item) => {
    return intersects(selectRect.value, item.rect)
  })

  if (selected.length === 1) {
    selectable.value = []
    const uuid = selected[0].item.uuid
    const el = findParagraphElement(uuid)
    if (!el) {
      return
    }
    const item = buildDraggableItem(el)

    if (!item) {
      return
    }

    if (item.itemType === 'existing') {
      eventBus.emit('select:end', [item.uuid])
    }
    return
  }

  selected.forEach((item) => {
    Sortable.utils.select(item.item.element)
  })

  eventBus.emit(
    'select:end',
    selected.map((v) => v.item.uuid),
  )
}

watch(isSelecting, (v) => {
  if (v) {
    document.body.classList.add('pb-is-selecting')
  } else {
    document.body.classList.remove('pb-is-selecting')
  }
})

function onWindowMouseDown(e: MouseEvent) {
  selectable.value = []

  if (e.ctrlKey) {
    return
  }
  if (e.target && e.target instanceof Element) {
    if (shouldStartMultiSelect(e.target)) {
      window.addEventListener('mousemove', onWindowMouseMove)
      downX.value = e.x
      downY.value = e.y
    }
  }
}

function onAnimationFrame(e: AnimationFrameEvent) {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('mousedown', onWindowMouseDown)
  window.addEventListener('mouseup', onWindowMouseUp)
  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mousedown', onWindowMouseDown)
  window.removeEventListener('mouseup', onWindowMouseUp)
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
