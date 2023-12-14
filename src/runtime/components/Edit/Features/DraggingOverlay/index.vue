<template>
  <Teleport to="body">
    <div v-if="isVisible" class="bk bk-dragging-overlay" :style="style" />
  </Teleport>
  <DropTargets
    v-if="dragItems.length"
    :items="dragItems"
    :x="boxX"
    :y="boxY"
    :width="width"
    :height="height"
    :mouse-x="mouseX"
    :mouse-y="mouseY"
    @drop="onDrop"
  />
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onUnmounted } from '#imports'
import DropTargets, { type DropTargetEvent } from './DropTargets/index.vue'

import type {
  AnimationFrameEvent,
  DraggableClipboardItem,
  DraggableExistingBlokkliItem,
  DraggableItem,
  DraggableNewItem,
  DraggableReusableItem,
  DraggableSearchContentItem,
  DraggableStartEvent,
  KeyPressedEvent,
} from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'

const { eventBus, adapter, state } = useBlokkli()

const isVisible = ref(false)
const width = ref(0)
const height = ref(0)
const x = ref(0)
const y = ref(0)
const mouseX = ref(0)
const mouseY = ref(0)
const offsetX = ref(0)
const offsetY = ref(0)

const dragItems = ref<DraggableItem[]>([])

const onDrop = async (e: DropTargetEvent) => {
  const afterUuid = e.preceedingUuid
  const host = e.host
  if (e.items.every((v) => v.itemType === 'existing')) {
    const items = e.items as DraggableExistingBlokkliItem[]
    const uuids = items.map((v) => v.uuid)
    await state.mutateWithLoadingState(
      adapter.moveMultipleItems({
        uuids,
        afterUuid,
        host,
      }),
    )
  } else if (e.items.every((v) => v.itemType === 'new')) {
    const items = e.items as DraggableNewItem[]
    const item = items[0]
    const definition = getDefinition(item.itemBundle)
    if (definition?.disableEdit) {
      await state.mutateWithLoadingState(
        adapter.addNewBlokkliItem({
          type: item.itemBundle,
          item,
          host,
          afterUuid,
        }),
      )
    } else {
      eventBus.emit('addNewBlokkliItem', {
        type: item.itemBundle,
        item,
        host,
        afterUuid,
      })
    }
  } else if (e.items.every((v) => v.itemType === 'reusable')) {
    const item = e.items[0] as DraggableReusableItem
    await state.mutateWithLoadingState(
      adapter.addReusableItem({
        item,
        host,
        afterUuid,
      }),
    )
  } else if (e.items.every((v) => v.itemType === 'clipboard')) {
    const item = e.items[0] as DraggableClipboardItem
    if (adapter.addBlokkliItemFromClipboard) {
      await state.mutateWithLoadingState(
        adapter.addBlokkliItemFromClipboard({
          afterUuid,
          item,
          host,
        }),
      )
    }
  } else if (
    e.items.every((v) => v.itemType === 'search_content') &&
    adapter.addContentSearchItem
  ) {
    const item = e.items[0] as DraggableSearchContentItem
    state.mutateWithLoadingState(
      adapter.addContentSearchItem({
        item: item.searchItem,
        host: host,
        bundle: item.itemBundle,
        afterUuid,
      }),
    )
  }
  eventBus.emit('dragging:end')
}

const boxX = computed(() => mouseX.value - offsetX.value)
const boxY = computed(() => mouseY.value - offsetY.value)

const style = computed(() => {
  return {
    width: width.value + 'px',
    height: height.value + 'px',
    transform: `translate(${boxX.value}px, ${boxY.value}px)`,
  }
})

function loop(e: AnimationFrameEvent) {
  mouseX.value = e.mouseX
  mouseY.value = e.mouseY
  if (!isVisible.value) {
    offsetX.value = mouseX.value - x.value
    offsetY.value = mouseY.value - y.value
    isVisible.value = true
  }
}

const onMouseUp = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  eventBus.emit('dragging:end')
}

function onDraggingStart(e: DraggableStartEvent) {
  dragItems.value = e.items
  const item = e.items[0]
  console.log(e)
  if ('element' in item) {
    const rect = item.element.getBoundingClientRect()
    width.value = rect.width
    height.value = rect.height
    x.value = rect.x
    y.value = rect.y

    eventBus.on('animationFrame', loop)

    window.addEventListener('mouseup', onMouseUp)
  }
}

function onDraggingEnd() {
  isVisible.value = false
  dragItems.value = []
  eventBus.off('animationFrame', loop)
  window.removeEventListener('mouseup', onMouseUp)
}

const onKeyPressed = (e: KeyPressedEvent) => {
  if (e.code === 'Escape') {
    eventBus.emit('dragging:end')
  }
}

onMounted(() => {
  eventBus.on('dragging:start', onDraggingStart)
  eventBus.on('dragging:end', onDraggingEnd)
  eventBus.on('keyPressed', onKeyPressed)
})

onUnmounted(() => {
  eventBus.off('dragging:start', onDraggingStart)
  eventBus.off('dragging:end', onDraggingEnd)
  eventBus.off('keyPressed', onKeyPressed)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<script lang="ts">
export default {
  name: 'DraggingOverlay',
}
</script>
