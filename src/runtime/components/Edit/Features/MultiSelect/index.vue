<template>
  <Overlay
    v-if="shouldRender"
    :start-x="downX"
    :start-y="downY"
    @select="onSelect"
  />
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import Overlay from './Overlay/index.vue'

const { keyboard, eventBus } = useBlokkli()

const shouldRender = ref(false)
const downX = ref(0)
const downY = ref(0)

const onSelect = (uuids: string[]) => {
  shouldRender.value = false
  eventBus.emit('select:end', uuids)
}

function shouldStartMultiSelect(target: Element): boolean {
  const isInsideItem = !!target.closest('.draggable')
  if (isInsideItem) {
    return false
  }
  const isInsideControl = !!target.closest('.bk-control')
  if (isInsideControl) {
    return false
  }

  const isInSidebar = !!target.closest('.bk-sidebar')
  if (isInSidebar) {
    return false
  }

  return true
}

function onWindowMouseUp() {
  shouldRender.value = false
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
}

function onWindowMouseMove(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()

  const diffX = Math.abs(downX.value - e.x)
  const diffY = Math.abs(downY.value - e.y)
  if (diffX > 3 || diffY > 3) {
    shouldRender.value = true
  }
}

function onWindowMouseDown(e: MouseEvent) {
  if (
    e.ctrlKey ||
    keyboard.isPressingSpace.value ||
    keyboard.isPressingControl.value
  ) {
    return
  }
  if (e.target && e.target instanceof Element) {
    if (shouldStartMultiSelect(e.target)) {
      downX.value = e.x
      downY.value = e.y
      window.addEventListener('mousemove', onWindowMouseMove)
      window.addEventListener('mouseup', onWindowMouseUp)
    }
  }
}

onMounted(() => {
  window.addEventListener('mousedown', onWindowMouseDown)
  window.addEventListener('mouseup', onWindowMouseUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mousedown', onWindowMouseDown)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>