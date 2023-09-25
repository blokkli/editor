<template>
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
      ></rect>
    </svg>

    <Item
      v-if="isSelecting"
      v-for="item in actuallySelectable"
      :rect="item.rect"
      :select-rect="selectRect"
      :is-intersecting="intersects(selectRect, item.rect)"
    />
  </div>
</template>

<script lang="ts" setup>
import { eventBus } from '../eventBus'
import { buildDraggableItem, falsy, findParagraphElement } from '../helpers'
import { AnimationFrameEvent, DraggableExistingParagraphItem } from '../types'
import type { Rectangle } from './Item/index.vue'
import Item from './Item/index.vue'

export type SelectableElement = {
  item: DraggableExistingParagraphItem
  nested: boolean
  rect: Rectangle
}

const emit = defineEmits<{
  (e: 'startSelect'): void
  (e: 'unselect'): void
  (e: 'selectSingle', data: DraggableExistingParagraphItem): void
  (e: 'selectMultiple', data: DraggableExistingParagraphItem[]): void
}>()

const props = defineProps<{
  isPressingControl: boolean
}>()

let timeout: any = null
const isSelecting = ref(false)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)
const selectable = ref<SelectableElement[]>([])
const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)

const actuallySelectable = computed(() => {
  return selectable.value.filter((v) => {
    if (props.isPressingControl) {
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

  return true
}

function onWindowMouseMove(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  currentX.value = e.x + window.scrollX
  currentY.value = e.y + window.scrollY
}

function onWindowMouseUp(e: MouseEvent) {
  clearTimeout(timeout)
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
      emit('selectSingle', item)
    }
    return
  }

  emit(
    'selectMultiple',
    selected.map((v) => v.item),
  )
}

function onWindowMouseDown(e: MouseEvent) {
  selectable.value = []
  isSelecting.value = false

  clearTimeout(timeout)
  if (e.ctrlKey) {
    return
  }
  if (e.target && e.target instanceof Element) {
    if (shouldStartMultiSelect(e.target)) {
      emit('startSelect')
      timeout = setTimeout(() => {
        const newX = e.x + window.scrollX
        const newY = e.y + window.scrollY
        startX.value = newX
        startY.value = newY
        currentX.value = newX
        currentY.value = newY
        window.addEventListener('mousemove', onWindowMouseMove)
        selectable.value = getSelectableElements()
        isSelecting.value = true
      }, 100)
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

<style lang="postcss"></style>
