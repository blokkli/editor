<template>
  <Teleport to="body">
    <DragItems
      v-if="isVisible"
      :x="mouseX"
      :y="mouseY"
      :start-coords="startCoords"
      :items="dragItems"
    />
  </Teleport>
  <DropTargets
    v-if="dragItems.length"
    :items="dragItems"
    :box="box"
    :mouse-x="mouseX"
    :mouse-y="mouseY"
    @drop="onDrop"
  />
  <Teleport to="body">
    <Transition name="bk-touch-bar">
      <div
        v-if="ui.isMobile.value && isVisible"
        class="bk bk-touch-action-bar bk-control"
      >
        <button
          class="bk-button bk-is-danger"
          @click.stop.prevent.capture="eventBus.emit('dragging:end')"
        >
          Cancel dragging
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  onMounted,
  onUnmounted,
  defineBlokkliFeature,
} from '#imports'
import DropTargets, { type DropTargetEvent } from './DropTargets/index.vue'
import DragItems from './DragItems/index.vue'

import type {
  AnimationFrameEvent,
  Coord,
  DraggableActionItem,
  DraggableClipboardItem,
  DraggableExistingBlokkliItem,
  DraggableItem,
  DraggableNewItem,
  DraggableReusableItem,
  DraggableSearchContentItem,
  DraggableStartEvent,
  KeyPressedEvent,
  Rectangle,
} from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'

const adapter = defineBlokkliFeature({
  description: 'Renders an overlay when dragging or placing a block.',
})

const { eventBus, state, ui, animation } = useBlokkli()

const isVisible = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)
const startCoords = ref<Coord>({
  x: 0,
  y: 0,
})

const box = ref<Rectangle>({
  x: 0,
  y: 0,
  width: 10,
  height: 10,
})

const dragItems = ref<DraggableItem[]>([])

const onDrop = async (e: DropTargetEvent) => {
  onDraggingEnd()
  eventBus.emit('dragging:end')
  nextTick(async () => {
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

      if (ui.isMobile.value) {
        eventBus.emit('scrollIntoView', {
          uuid: uuids[0],
          center: true,
        })
      }
      eventBus.emit('select:end', uuids)
    } else if (e.items.every((v) => v.itemType === 'new')) {
      const items = e.items as DraggableNewItem[]
      const item = items[0]
      const definition = getDefinition(item.itemBundle)
      if (definition?.disableEdit || definition?.noAddForm) {
        await state.mutateWithLoadingState(
          adapter.addNewBlock({
            type: item.itemBundle,
            item,
            host,
            afterUuid,
          }),
        )
      } else {
        eventBus.emit('add:block:new', {
          type: item.itemBundle,
          item,
          host,
          afterUuid,
        })
      }
    } else if (e.items.every((v) => v.itemType === 'reusable')) {
      const item = e.items[0] as DraggableReusableItem
      await state.mutateWithLoadingState(
        adapter.addLibraryItem({
          libraryItemUuid: item.libraryItemUuid,
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
    } else if (e.items.every((v) => v.itemType === 'action')) {
      eventBus.emit('action:placed', {
        preceedingUuid: e.preceedingUuid,
        action: e.items[0] as DraggableActionItem,
        host: e.host,
        field: e.field,
      })
    }
  })
}

function loop(e: AnimationFrameEvent) {
  mouseX.value = e.mouseX
  mouseY.value = e.mouseY
  if (!isVisible.value) {
    isVisible.value = true
  }

  const rect = document
    .querySelector('.bk-dragging-overlay')
    ?.getBoundingClientRect()
  if (rect) {
    box.value = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  }
}

const onMouseUp = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (!ui.isMobile.value) {
    eventBus.emit('dragging:end')
  }
}

function onDraggingStart(e: DraggableStartEvent) {
  startCoords.value = e.coords
  animation.requestDraw()
  const item = e.items[0]
  if (!item) {
    return
  }
  if ('element' in item) {
    eventBus.on('animationFrame', loop)
    document.removeEventListener('mouseup', onMouseUp)
    document.addEventListener('mouseup', onMouseUp)
  }
  dragItems.value = e.items
}

function onDraggingEnd() {
  isVisible.value = false
  dragItems.value = []
  eventBus.off('animationFrame', loop)
  document.removeEventListener('mouseup', onMouseUp)
}

const onKeyPressed = (e: KeyPressedEvent) => {
  if (e.code === 'Escape') {
    document.removeEventListener('mouseup', onMouseUp)
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
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<script lang="ts">
export default {
  name: 'DraggingOverlay',
}
</script>
