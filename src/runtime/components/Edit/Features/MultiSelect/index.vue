<template>
  <Teleport to="body">
    <Transition name="bk-touch-bar">
      <div
        v-if="ui.isMobile.value && selection.isMultiSelecting.value"
        class="bk bk-touch-action-bar bk-control"
      >
        <button
          class="bk-button bk-is-primary"
          @click.stop.prevent.capture="
            eventBus.emit('select:end', [...selection.uuids.value])
          "
        >
          Finish selecting
        </button>
      </div>
    </Transition>
  </Teleport>
  <Overlay
    v-if="shouldRender"
    :start-x="downX"
    :start-y="downY"
    @select="onSelect"
  />
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineBlokkliFeature,
} from '#imports'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  description:
    'Implements support for selecting multiple blocks using a select rectangle.',
})

const { keyboard, eventBus, selection, ui } = useBlokkli()

const enabled = computed(() => !selection.editableActive.value)

const shouldRender = ref(false)
const downX = ref(0)
const downY = ref(0)

const onSelect = (uuids: string[]) => {
  shouldRender.value = false
  eventBus.emit('select:end', uuids)
}

function shouldStartMultiSelect(target: Element): boolean {
  if (!enabled.value) {
    return false
  }
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
    keyboard.isPressingControl.value ||
    !enabled.value ||
    selection.isDragging.value
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

const cleanup = () => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mousedown', onWindowMouseDown)
  window.removeEventListener('mouseup', onWindowMouseUp)
}

const init = () => {
  cleanup()
  if (ui.isMobile.value) {
    return
  }
  window.addEventListener('mousedown', onWindowMouseDown)
  window.addEventListener('mouseup', onWindowMouseUp)
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<script lang="ts">
export default {
  name: 'MultiSelect',
}
</script>
