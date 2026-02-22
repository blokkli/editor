<template>
  <Renderer
    v-if="dragItems.length && isVisible"
    v-slot="{ backgroundColor, color, label }"
    :items="dragItems"
    :box="box"
    :mouse-x="mouseX"
    :mouse-y="mouseY"
    :is-touch="isTouching"
  >
    <DragItems
      ref="dragItemsComponent"
      :x="mouseX"
      :y="mouseY"
      :start-coords="startCoords"
      :items="dragItems"
      :is-touch="isTouching"
      :background-color
      :color
      :active-label="label"
    />
  </Renderer>
  <Teleport to="#bk-canvas-overlay">
    <BlokkliTransition name="caret-tooltip">
      <BundleSelector
        v-if="bundleSelectorData"
        :bundles="bundleSelectorData.bundles"
        :label="
          $t('draggingOverlaySelectBundle', 'Select block type to create')
        "
        :anchor-coordinates="bundleSelectorData.anchorCoordinates"
        hide-actions
        @close="onCloseBundleSelector"
        @select="onSelectBundle"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import DragItems from './DragItems/index.vue'
import Renderer from './Renderer/index.vue'
import {
  ref,
  useBlokkli,
  onUnmounted,
  defineBlokkliFeature,
  nextTick,
  useTemplateRef,
} from '#imports'
import { renderCycle } from '#blokkli/editor/helpers/vue'
import { BundleSelector, BlokkliTransition } from '#blokkli/editor/components'
import { onBlokkliEvent, defineDropHandler } from '#blokkli/editor/composables'
import type { DropTargetEvent } from '#blokkli/editor/events'
import { MOUSE_BUTTON } from '#blokkli/editor/helpers/dom'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import type { DraggableItem } from '#blokkli/editor/types/draggable'
import type { DropExecuteResult } from '#blokkli/editor/providers/dragdrop'

const { adapter } = defineBlokkliFeature({
  icon: 'bk_mdi_drag_pan',
  id: 'dragging-overlay',
  label: 'Dragging Overlay',
  description: 'Renders an overlay when dragging or placing a block.',
  screenshot: 'feature-dragging-overlay.jpg',
})

const {
  eventBus,
  state,
  ui,
  animation,
  dom,
  selection,
  definitions,
  blocks,
  directive,
  fields,
  $t,
  dragdrop,
} = useBlokkli()

// ---------------------------------------------------------------------------
// Promise-based BundleSelector.
// ---------------------------------------------------------------------------
type BundleSelectorData = {
  bundles: string[]
  anchorCoordinates: Coord
}

const bundleSelectorData = ref<BundleSelectorData | null>(null)
let bundleSelectorResolve: ((bundle: string | null) => void) | null = null

function showBundleSelector(bundles: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    bundleSelectorResolve = resolve
    bundleSelectorData.value = {
      bundles,
      anchorCoordinates: getAnchorCoordinates(),
    }
  })
}

function onCloseBundleSelector() {
  bundleSelectorData.value = null
  if (bundleSelectorResolve) {
    bundleSelectorResolve(null)
    bundleSelectorResolve = null
  }
}

function onSelectBundle(bundle: string) {
  bundleSelectorData.value = null
  if (bundleSelectorResolve) {
    bundleSelectorResolve(bundle)
    bundleSelectorResolve = null
  }
}

// ---------------------------------------------------------------------------
// Drag item rendering state.
// ---------------------------------------------------------------------------
const dragItemsComponent = useTemplateRef('dragItemsComponent')
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

function getAnchorCoordinates() {
  return ui.toArtboardCoords({
    x: mouseX.value,
    y: mouseY.value,
  })
}

// ---------------------------------------------------------------------------
// Core drop handlers registered via defineDropHandler.
// ---------------------------------------------------------------------------

// existing: move/copy blocks.
defineDropHandler('existing', {
  async execute({ items, host, afterUuid }) {
    const uuids = items.map((v) => v.block.uuid)
    const isCopy = items.some((v) => v.isCopy)

    if (isCopy && adapter.pasteExistingBlocks) {
      await state.mutateWithLoadingState(() =>
        adapter.pasteExistingBlocks!({
          uuids,
          host: {
            type: host.type,
            uuid: host.uuid,
            fieldName: host.fieldName,
          },
          preceedingUuid: afterUuid,
        }),
      )
    } else {
      await state.mutateWithLoadingState(() =>
        adapter.moveMultipleBlocks({
          uuids,
          afterUuid,
          host,
        }),
      )
    }

    if (uuids.length >= 1 && uuids.length <= 10) {
      for (let i = 0; i < uuids.length; i++) {
        dom.refreshBlockRect(uuids[i]!)
      }
    }

    if (ui.isMobile.value && uuids.length) {
      eventBus.emit('scrollIntoView', {
        uuid: uuids[0]!,
        center: true,
      })
    }
  },
})

// ---------------------------------------------------------------------------
// Thin dispatcher: onDrop.
// ---------------------------------------------------------------------------
let allUuidsBefore: string[] = []
let lastDropResult: DropExecuteResult | null = null

const onDrop = async (e: DropTargetEvent) => {
  allUuidsBefore = state.getAllUuids()

  await nextTick(async () => {
    const itemType = e.items[0]?.itemType
    if (!itemType) {
      return
    }

    const handler = dragdrop.getDropHandler(itemType)
    if (!handler) {
      return
    }

    const baseCtx = {
      items: e.items as any,
      field: e.field,
      host: e.host,
      afterUuid: e.preceedingUuid ?? null,
    }

    let result: DropExecuteResult | undefined

    if (handler.resolveBundles) {
      const bundles = await handler.resolveBundles(baseCtx)

      if (bundles.length === 0) {
        return
      }

      let bundle: string
      if (bundles.length === 1) {
        bundle = bundles[0]!
      } else {
        const selected = await showBundleSelector(bundles)
        if (!selected) {
          return
        }
        bundle = selected
      }

      result = (await handler.execute({ ...baseCtx, bundle })) || undefined
    } else {
      result = (await handler.execute({ ...baseCtx, bundle: '' })) || undefined
    }

    lastDropResult = result ?? null

    eventBus.emit('dragging:end')
    eventBus.emit('item:dropped')
  })

  mouseX.value = 0
  mouseY.value = 0
}

// ---------------------------------------------------------------------------
// Post-drop: detect new blocks, select them, focus editable field.
// ---------------------------------------------------------------------------
onBlokkliEvent('state:reloaded', async function () {
  if (!allUuidsBefore.length) {
    return
  }
  const allUuidsAfter = state.getAllUuids()
  const newUuid = allUuidsAfter.find((uuid) => !allUuidsBefore.includes(uuid))
  const dropResult = lastDropResult
  allUuidsBefore = []
  lastDropResult = null

  if (!newUuid) {
    return
  }
  eventBus.emit('select', newUuid)
  // @todo: DOM is not ready yet, so the block is never found.
  // figure out a reliable way to open the editable field after a block
  // was added.
  await renderCycle()
  const newBlock = blocks.getBlock(newUuid)

  if (!newBlock) {
    return
  }

  const allSelected = [...selection.uuids.value, newBlock.uuid]

  eventBus.emit('select', allSelected)

  if (!dropResult?.focusEditable) {
    return
  }

  const definition = definitions.getBlockDefinition(
    newBlock.bundle,
    newBlock.fieldListType,
  )

  if (!definition?.editor?.addBehaviour?.startsWith('editable:')) {
    return
  }

  const editableField = definition.editor.addBehaviour.split(':')[1]

  if (!editableField) {
    return
  }

  const editableFieldElement = directive
    .getEditablesForBlock(newUuid)
    .find((v) => v.fieldName === editableField)

  if (!editableFieldElement) {
    return
  }

  eventBus.emit('editable:focus', {
    fieldName: editableField,
    uuid: newUuid,
  })
})

// ---------------------------------------------------------------------------
// Drag interaction lifecycle.
// ---------------------------------------------------------------------------
onBlokkliEvent('dragging:move', (e) => {
  mouseX.value = e.x
  mouseY.value = e.y
})

onBlokkliEvent('dragging:drop', onDrop)

function loop() {
  if (!isVisible.value) {
    isVisible.value = true
  }

  if (!dragItemsComponent.value) {
    return
  }

  box.value = dragItemsComponent.value.getRect()
}

const onMouseUp = (e: PointerEvent) => {
  if (e.button === MOUSE_BUTTON.AUXILIARY) {
    return
  }
  e.preventDefault()
  e.stopPropagation()
  if (!ui.isMobile.value) {
    eventBus.emit('dragging:end')
  }
}

function onMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onBlokkliEvent('dragging:start', (e) => {
  isTouching.value = e.mode === 'touch'
  startCoords.value = e.coords
  animation.requestDraw()
  const item = e.items[0]
  if (!item) {
    return
  }

  mouseX.value = e.coords.x
  mouseY.value = e.coords.y

  // Before showing the drop targets we update all currently visible rects to
  // ensure the user sees the correct drop targets right away.
  dom.updateVisibleRects()
  dragItems.value = e.items
  if (!isTouching.value) {
    document.removeEventListener('pointerup', onMouseUp)
    document.addEventListener('pointerup', onMouseUp)
    document.removeEventListener('pointermove', onMouseMove, {
      capture: true,
    })
    document.addEventListener('pointermove', onMouseMove, { capture: true })
  }
  eventBus.on('animationFrame', loop)
})

onBlokkliEvent('dragging:end', () => {
  isVisible.value = false
  dragItems.value = []
  eventBus.off('animationFrame', loop)
  document.removeEventListener('pointerup', onMouseUp)
  document.removeEventListener('pointermove', onMouseMove, { capture: true })
})

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }

  if (e.code === 'Escape') {
    eventBus.emit('dragging:end')
  }
})

onBlokkliEvent('block:append', async (e) => {
  allUuidsBefore = state.getAllUuids()
  // Use the new handler to add a block via the 'new' drop handler.
  const handler = dragdrop.getDropHandler('new')
  if (handler) {
    const result = await handler.execute({
      items: [
        {
          itemType: 'new',
          itemBundle: e.bundle,
          element: () => document.createElement('div'),
        },
      ],
      field: fields.find(e.host.uuid, e.host.fieldName)!,
      host: e.host,
      afterUuid: e.afterUuid,
      bundle: e.bundle,
    })
    lastDropResult = result ?? null
  }
})

onUnmounted(() => {
  document.removeEventListener('pointerup', onMouseUp)
  document.removeEventListener('pointermove', onMouseMove, { capture: true })
})
</script>

<script lang="ts">
export default {
  name: 'DraggingOverlay',
}
</script>
