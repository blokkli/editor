<template>
  <Teleport to="body">
    <div class="bk bk-multi-select">
      <svg
        class="bk-multi-select-area"
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
        v-for="item in selectable"
        :key="item.uuid"
        :rect="item.rect"
        :is-intersecting="item.isIntersecting"
        :offset-y="scrollY"
      />
    </div>
  </Teleport>
  <Teleport to=".bk-main-canvas">
    <div
      ref="anchor"
      class="bk-multi-select-anchor"
      :style="{ top: anchorY + 'px', left: anchorX + 'px' }"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import type { AnimationFrameEvent } from '#blokkli/types'
import type { Rectangle } from '#blokkli/types'
import { intersects } from '#blokkli/helpers'
import Item from './Item/index.vue'

const { keyboard, eventBus, ui } = useBlokkli()

export type SelectableElement = {
  uuid: string
  nested: boolean
  rect: Rectangle
  isIntersecting: boolean
}

const props = defineProps<{
  startX: number
  startY: number
}>()

defineEmits<{
  (e: 'select', uuids: string[]): void
}>()

const anchorX = ref(0)
const anchorY = ref(0)
const anchor = ref<HTMLDivElement | null>(null)
const scrollY = ref(0)

const selectable = ref<SelectableElement[]>([])
const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)

const getAnchorRect = () => {
  if (!anchor.value) {
    return { x: 0, y: 0 }
  }
  const rect = anchor.value.getBoundingClientRect()
  return {
    x: rect.x,
    y: rect.y,
  }
}

const actuallySelectable = computed(() => {
  return selectable.value.filter((v) => {
    if (keyboard.isPressingControl.value) {
      return true
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

const selectRect = ref<Rectangle>({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
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

function emitSelected() {
  const selected = actuallySelectable.value.filter((item) => {
    return intersects(selectRect.value, item.rect)
  })
  eventBus.emit(
    'select:end',
    selected.map((v) => v.uuid),
  )

  // selected.forEach((item) => {
  //   Sortable.utils.select(item.uuid)
  // })
}

function onAnimationFrame(e: AnimationFrameEvent) {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
  const anchorRect = getAnchorRect()
  const startX = anchorRect.x
  const startY = anchorRect.y

  scrollY.value = window.scrollY

  selectable.value = Object.entries(e.rects).map(([uuid, rect]) => {
    return {
      uuid,
      nested: false,
      rect,
      isIntersecting: intersects(selectRect.value, rect),
    }
  })

  const ax = startX > e.mouseX ? e.mouseX : startX
  const ay = startY > e.mouseY ? e.mouseY : startY
  const bx = startX > e.mouseX ? startX : e.mouseX
  const by = startY > e.mouseY ? startY : e.mouseY
  selectRect.value = {
    x: ax,
    y: ay,
    width: bx - ax,
    height: by - ay,
  }
}

onMounted(() => {
  const artboard = ui.artboardElement()
  const artboardRect = artboard.getBoundingClientRect()
  const scale = ui.getArtboardScale()
  const newX = props.startX
  const newY = props.startY
  anchorX.value = (newX - artboardRect.left) / scale
  anchorY.value = (newY - artboardRect.top) / scale

  eventBus.on('animationFrame', onAnimationFrame)
  document.body.classList.add('bk-is-selecting')
  eventBus.emit('select:start')
})

onBeforeUnmount(() => {
  eventBus.off('animationFrame', onAnimationFrame)
  document.body.classList.remove('bk-is-selecting')
  emitSelected()
})
</script>