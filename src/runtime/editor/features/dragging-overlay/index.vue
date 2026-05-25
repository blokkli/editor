<template>
  <Renderer
    v-if="dragItems.length && isVisible"
    v-slot="{ backgroundColor, color, label, activeRect }"
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
      :active-rect="activeRect"
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
import {
  ref,
  useBlokkli,
  onUnmounted,
  defineBlokkliFeature,
  nextTick,
  useTemplateRef,
  defineAsyncComponent,
} from '#imports'
import { renderCycle } from '#blokkli/editor/helpers/vue'
import { BundleSelector, BlokkliTransition } from '#blokkli/editor/components'
import { onBlokkliEvent, defineDropHandler } from '#blokkli/editor/composables'
import type { DropTargetEvent } from '#blokkli/editor/events'
import { MOUSE_BUTTON } from '#blokkli/editor/helpers/dom'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import type { DraggableItem } from '#blokkli/editor/types/draggable'
import type { DropExecuteResult } from '#blokkli/editor/providers/dragdrop'

const DragItems = defineAsyncComponent(() => import('./DragItems/index.vue'))
const Renderer = defineAsyncComponent(() => import('./Renderer/index.vue'))

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
  permissions,
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
// Post-add: select the newly added block and, per its definition's
// addBehaviour, open its editable field (or complex-option editor).
//
// Called directly after the drop handler's `execute` resolves — at that point
// the mutation has completed and the drop result (e.g. `focusEditable`) is
// known. This must NOT hang off `state:reloaded`: the mutation emits that event
// from inside `execute` (via `setContext`, on a `nextTick`), so it fires before
// `execute` returns its result — and `state:reloaded` also fires on unrelated
// reloads (undo/redo, every mutation), so it is the wrong signal for add-only
// behaviour.
// ---------------------------------------------------------------------------
async function selectAndFocusAddedBlock(
  uuidsBefore: string[],
  dropResult: DropExecuteResult | undefined,
) {
  const newUuid = state
    .getAllUuids()
    .find((uuid) => !uuidsBefore.includes(uuid))

  if (!newUuid) {
    return
  }

  eventBus.emit('select', newUuid)

  // Wait one render cycle for the freshly added block's component (and its
  // editable directives) to mount before looking it up.
  await renderCycle()
  const newBlock = blocks.getBlock(newUuid)
  if (!newBlock) {
    return
  }

  eventBus.emit('select', [...selection.uuids.value, newBlock.uuid])

  const definition = definitions.getBlockDefinition(
    newBlock.bundle,
    newBlock.fieldListType,
    newBlock.parentBlockBundle,
  )
  const addBehaviour = definition?.editor?.addBehaviour

  if (addBehaviour?.startsWith('complex-option:')) {
    const optionKey = addBehaviour.split(':')[1]
    if (!optionKey) {
      return
    }
    const option = definition?.options?.[optionKey]
    if (option?.type !== 'json' || !option.dataType) {
      return
    }
    eventBus.emit('option:edit-complex', {
      uuid: newUuid,
      key: optionKey,
      dataType: option.dataType,
    })
    return
  }

  if (!dropResult?.focusEditable) {
    return
  }

  if (addBehaviour?.startsWith('editable:')) {
    const editableField = addBehaviour.split(':')[1]
    if (!editableField) {
      return
    }

    const editableFieldElement = directive
      .getEditablesForBlock(newUuid)
      .find((v) => v.fieldName === editableField)
    if (!editableFieldElement) {
      return
    }

    eventBus.emit('editable:open', {
      fieldName: editableField,
      uuid: newUuid,
    })
  }
}

// ---------------------------------------------------------------------------
// Thin dispatcher: onDrop.
// ---------------------------------------------------------------------------
const onDrop = async (e: DropTargetEvent) => {
  const uuidsBefore = state.getAllUuids()

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
      const bundles = (await handler.resolveBundles(baseCtx)).filter((b) =>
        permissions.checkBlockBundlePermission(b, 'add'),
      )

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

    eventBus.emit('dragging:end')
    eventBus.emit('item:dropped')

    await selectAndFocusAddedBlock(uuidsBefore, result)
  })

  mouseX.value = 0
  mouseY.value = 0
}

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
  const uuidsBefore = state.getAllUuids()
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
    await selectAndFocusAddedBlock(uuidsBefore, result ?? undefined)
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

<style lang="postcss">
.bk-vars.bk-dragging-overlay {
  @apply fixed bottom-auto top-0 left-0 pointer-events-none z-dragging-overlay rounded select-none will-change-transform cursor-grabbing;

  * {
    @apply !pointer-events-none;
  }

  &.bk-is-touch {
    @apply bottom-0 top-auto;
  }

  > .bk-dragging-overlay-item {
    @apply absolute h-full top-0 left-0;
    /* Don't multiply by scale - the transform: scale() already scales the border-radius */
    border-radius: calc(var(--bk-dragging-radius) * 1px);
  }

  > .bk-dragging-overlay-item.bk-is-top {
    @apply shadow-xl-even z-50 will-change-transform;

    &:before {
      content: '';
      @apply absolute top-0 left-0 w-full h-full z-50;
      outline: calc((5 / var(--bk-dragging-scale)) * 1px) solid
        rgb(var(--bk-active-background-color));
      outline-offset: 0px;
      border-radius: inherit;
    }
  }
  > .bk-dragging-overlay-item.bk-is-fallback {
    @apply border border-mono-500;
  }
}

.bk-vars {
  .bk-dragging-overlay-markup {
    @apply absolute top-0 left-0 origin-top-left w-full h-full pointer-events-none;
    @apply rounded;

    * {
      @apply !pointer-events-none;
    }

    > * {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      margin: 0 !important;
      /* Prevent text wrapping for cloned ghost elements (in particular: buttons). */
      width: calc(100% + 1px) !important;
      height: 100% !important;
      /* Reset any transforms on the cloned element to prevent offset from cursor. */
      transform: none !important;
      translate: none !important;
      rotate: none !important;
      scale: none !important;
      @apply !pointer-events-none;
      @apply !select-none !shadow-none;
    }
    @variant md {
      &:before {
        content: '';
        @apply absolute top-0 left-0 w-full h-full z-50 rounded;
      }
    }
  }

  .bk-dragging-overlay-fallback {
    @apply relative h-full w-full text-xl pt-30 lg:pt-0 lg:flex lg:items-center lg:justify-center;

    &.bk-is-top {
      @apply shadow-xl-even z-50;
    }

    > div {
      @apply flex flex-col items-center font-bold origin-top lg:origin-center;
    }

    .bk-blokkli-item-icon,
    .bk-icon {
      @apply relative overflow-hidden;
      @apply text-[1.8em] mb-[0.2em];
      @apply w-full h-full max-w-[1em] max-h-[1em] rounded-[0.2em] p-[0.1em] border-[0.02em];

      svg {
        @apply relative z-10;
      }

      &:before {
        content: '';
        @apply absolute top-0 left-0 w-full h-full bg-current opacity-10;
      }
    }
  }
}
</style>
