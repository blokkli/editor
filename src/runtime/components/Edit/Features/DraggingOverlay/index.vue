<template>
  <Teleport to="body">
    <DragItems
      v-if="isVisible"
      :x="mouseX"
      :y="mouseY"
      :start-coords="startCoords"
      :items="dragItems"
      :is-touch="isTouching"
      :active="active"
    />
  </Teleport>

  <DropAreas
    v-if="dragItems.length && isVisible"
    v-model="activeDropArea"
    :items="dragItems"
    :x="mouseX"
    :y="mouseY"
    :is-touch="isTouching"
  >
    <DropTargets
      v-model="activeDropTarget"
      :items="dragItems"
      :box="box"
      :mouse-x="mouseX"
      :mouse-y="mouseY"
      :is-touch="isTouching"
      :disabled="!!activeDropArea"
      @drop="onDrop"
    />
  </DropAreas>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  onUnmounted,
  defineBlokkliFeature,
  nextTick,
  computed,
} from '#imports'
import DropTargets, { type DropTargetEvent } from './DropTargets/index.vue'
import DragItems from './DragItems/index.vue'
import DropAreas from './DropAreas/index.vue'

import type {
  AnimationFrameEvent,
  BlokkliDefinitionAddBehaviour,
  BlokkliFieldElement,
  Coord,
  DraggableActionItem,
  DraggableClipboardItem,
  DraggableExistingBlock,
  DraggableHostData,
  DraggableItem,
  DraggableMediaLibraryItem,
  DraggableReusableItem,
  DraggableSearchContentItem,
  Rectangle,
} from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const activeDropTarget = ref<{
  id: string
  label: string
} | null>(null)
const activeDropArea = ref<{ id: string; label: string } | null>(null)

const active = computed(() => {
  if (activeDropArea.value) {
    return { ...activeDropArea.value, type: 'area' }
  } else if (activeDropTarget.value) {
    return {
      ...activeDropTarget.value,
      type: 'field',
    }
  }

  return null
})

const { adapter } = defineBlokkliFeature({
  icon: 'drag',
  id: 'dragging-overlay',
  label: 'Dragging Overlay',
  description: 'Renders an overlay when dragging or placing a block.',
  screenshot: 'feature-dragging-overlay.jpg',
})

const { eventBus, state, ui, animation, dom } = useBlokkli()

const isVisible = ref(false)
const isTouching = ref(false)
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

function isSameItemType(items: DraggableItem[]): boolean {
  return items.every((item) => item.itemType === items[0].itemType)
}

type FilteredItemType<T extends DraggableItem> = T extends {
  itemType: 'existing'
}
  ? { itemType: 'existing'; items: T[] }
  : { itemType: T['itemType']; item: T }

function filterItemType<T extends DraggableItem>(
  items: T[],
): FilteredItemType<T> {
  if (!items.length) {
    throw new Error('Items array is empty')
  }

  if (!isSameItemType(items)) {
    throw new Error('Items of different types')
  }

  const itemType = items[0].itemType

  if (itemType === 'existing') {
    return { itemType, items } as any
  }

  if (items.length > 1) {
    throw new Error(`Only a single item of type '${itemType}' is allowed.`)
  }

  return { itemType, item: items[0] } as FilteredItemType<T>
}

const onDropNew = async (
  bundle: string,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  const definition = getDefinition(bundle)
  const addBehaviour: BlokkliDefinitionAddBehaviour =
    definition?.editor?.addBehaviour || 'form'
  if (
    definition?.editor?.disableEdit ||
    addBehaviour === 'no-form' ||
    addBehaviour.startsWith('editable:') ||
    !adapter.formFrameBuilder
  ) {
    await state.mutateWithLoadingState(
      adapter.addNewBlock({
        bundle,
        host,
        afterUuid,
      }),
    )
  } else {
    eventBus.emit('add:block:new', {
      bundle,
      host,
      afterUuid,
    })
  }
}

const onDropExisting = async (
  items: DraggableExistingBlock[],
  host: DraggableHostData,
  afterUuid?: string,
) => {
  const uuids = items.map((v) => v.uuid)
  await state.mutateWithLoadingState(
    adapter.moveMultipleBlocks({
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
}

const onDropReusable = async (
  item: DraggableReusableItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  await state.mutateWithLoadingState(
    adapter.addLibraryItem({
      libraryItemUuid: item.libraryItemUuid,
      host,
      afterUuid,
    }),
  )
}

const onDropClipboardItem = async (
  item: DraggableClipboardItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  if (adapter.addBlockFromClipboardItem) {
    await state.mutateWithLoadingState(
      adapter.addBlockFromClipboardItem({
        afterUuid,
        item,
        host,
      }),
    )
  }
}

const onDropMediaLibraryItem = async (
  item: DraggableMediaLibraryItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  if (adapter.mediaLibraryAddBlock) {
    await state.mutateWithLoadingState(
      adapter.mediaLibraryAddBlock({
        preceedingUuid: afterUuid,
        host,
        item,
      }),
    )
  }
}

const onDropSearchContentItem = async (
  item: DraggableSearchContentItem,
  host: DraggableHostData,
  afterUuid?: string,
) => {
  await state.mutateWithLoadingState(
    adapter.addContentSearchItem({
      item: item.searchItem,
      host: host,
      bundle: item.itemBundle,
      afterUuid,
    }),
  )
}

const onDropAction = (
  action: DraggableActionItem,
  host: DraggableHostData,
  field: BlokkliFieldElement,
  afterUuid?: string,
) => {
  eventBus.emit('action:placed', {
    preceedingUuid: afterUuid,
    action,
    host,
    field,
  })
}

const onDrop = async (e: DropTargetEvent) => {
  // All the existing UUIDs on the page.
  const existingUuids = state.renderedBlocks.value.map((v) => v.item.uuid)

  eventBus.emit('dragging:end')
  eventBus.emit('item:dropped')
  nextTick(async () => {
    const afterUuid = e.preceedingUuid
    const host = e.host
    const typed = filterItemType(e.items)
    if (typed.itemType === 'existing') {
      await onDropExisting(typed.items, host, afterUuid)
    } else if (typed.itemType === 'new') {
      await onDropNew(typed.item.itemBundle, host, afterUuid)
    } else if (typed.itemType === 'reusable') {
      await onDropReusable(typed.item, host, afterUuid)
    } else if (typed.itemType === 'clipboard') {
      await onDropClipboardItem(typed.item, host, afterUuid)
    } else if (typed.itemType === 'search_content') {
      await onDropSearchContentItem(typed.item, host, afterUuid)
    } else if (typed.itemType === 'action') {
      onDropAction(typed.item, host, e.field, afterUuid)
    } else if (typed.itemType === 'media_library') {
      await onDropMediaLibraryItem(typed.item, host, afterUuid)
    }

    // Try to find the new block that has been added.
    const newBlock = state.renderedBlocks.value.find(
      (v) => !existingUuids.includes(v.item.uuid),
    )
    if (!newBlock) {
      return
    }
    const newItem = dom.findBlock(newBlock.item.uuid)
    if (!newItem) {
      return
    }

    eventBus.emit('select', newBlock.item.uuid)

    if (typed.itemType !== 'new') {
      return
    }

    const definition = getDefinition(newBlock.item.bundle)

    if (!definition?.editor?.addBehaviour?.startsWith('editable:')) {
      return
    }

    const editableField = definition.editor.addBehaviour.split(':')[1]

    if (!editableField) {
      return
    }

    const editableFieldElement = newItem
      .element()
      .querySelector(`[data-blokkli-editable-field="${editableField}"]`)
    if (!(editableFieldElement instanceof HTMLElement)) {
      return
    }

    eventBus.emit('editable:focus', {
      fieldName: editableField,
      element: editableFieldElement,
    })
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

onBlokkliEvent('dragging:start', (e) => {
  activeDropArea.value = null
  activeDropTarget.value = null
  isTouching.value = e.mode === 'touch'
  startCoords.value = e.coords
  animation.requestDraw()
  const item = e.items[0]
  if (!item) {
    return
  }
  if ('element' in item) {
    eventBus.on('animationFrame', loop)
    if (!isTouching.value) {
      document.removeEventListener('mouseup', onMouseUp)
      document.addEventListener('mouseup', onMouseUp)
    }
  }
  dragItems.value = e.items
})

onBlokkliEvent('dragging:end', () => {
  isVisible.value = false
  dragItems.value = []
  eventBus.off('animationFrame', loop)
  document.removeEventListener('mouseup', onMouseUp)
})

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Escape') {
    document.removeEventListener('mouseup', onMouseUp)
    eventBus.emit('dragging:end')
  }
})

onBlokkliEvent('block:append', (e) => {
  onDropNew(e.bundle, e.host, e.afterUuid)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<script lang="ts">
export default {
  name: 'DraggingOverlay',
}
</script>
