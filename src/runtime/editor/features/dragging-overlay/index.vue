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
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { DraggableMediaLibraryItem } from '../media-library/types'
import type { DraggableSearchContentItem } from '../search/types'
import type { DropTargetEvent } from '#blokkli/editor/events'
import type { Coord, Rectangle } from '#blokkli/editor/types/geometry'
import type { DraggableExistingBlock, DraggableItem, } from '#blokkli/editor/types/draggable'
import type { DraggableClipboardItem } from '../clipboard/types'
import type { DraggableActionItem } from '../add-list/types'
import type { DraggableReusableItem } from '../library/types'
import type { DraggableExistingStructureBlock } from '../structure/types'
import type { BlokkliFieldElement, BlokkliItemHost } from '#blokkli/editor/types/field'
import type { BlokkliDefinitionAddBehaviour } from './../../../../global/types/definitions'

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
} = useBlokkli()

type BundleSelectorData = {
  bundles: string[]
  anchorCoordinates: Coord
  item: DraggableSearchContentItem | DraggableMediaLibraryItem[]
  host: BlokkliItemHost
  field: BlokkliFieldElement
  afterUuid: string | null
}

const bundleSelectorData = ref<BundleSelectorData | null>(null)

function onCloseBundleSelector() {
  bundleSelectorData.value = null
}

async function onSelectBundle(bundle: string) {
  const data = bundleSelectorData.value
  if (!data) {
    return
  }

  const item = data.item

  if (Array.isArray(item)) {
    await onDropMediaLibraryItem(
      data.field,
      item,
      data.host,
      data.afterUuid,
      bundle,
    )
  } else {
    await state.mutateWithLoadingState(() =>
      adapter.addContentSearchItem!({
        item: item.searchItem,
        host: data.host,
        bundle,
        afterUuid: data.afterUuid,
      }),
    )
  }

  onCloseBundleSelector()
}

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

function isSameItemType(items: DraggableItem[]): boolean {
  return items.every((item) => item.itemType === items[0]!.itemType)
}

type FilteredItemType<T extends DraggableItem> = T extends {
  itemType: 'existing'
}
  ? { itemType: 'existing'; items: T[] }
  : T extends { itemType: 'existing_structure' }
    ? { itemType: 'existing_structure'; items: T[] }
    : T extends { itemType: 'media_library' }
      ? { itemType: 'media_library'; items: T[] }
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

  const itemType = items[0]!.itemType

  if (
    itemType === 'existing' ||
    itemType === 'existing_structure' ||
    itemType === 'media_library'
  ) {
    return { itemType, items } as any
  }

  if (items.length > 1) {
    throw new Error(`Only a single item of type '${itemType}' is allowed.`)
  }

  return { itemType, item: items[0] } as FilteredItemType<T>
}

const onDropNew = async (
  bundle: string,
  host: BlokkliItemHost,
  afterUuid: string | null,
) => {
  const field = fields.find(host.uuid, host.fieldName)
  if (!field) {
    throw new Error(
      `Failed to locate field with name "${host.fieldName}" on UUID "${host.uuid}"`,
    )
  }
  const definition = definitions.getBlockDefinition(
    bundle,
    field.fieldListType,
    field.hostEntityBundle as any,
  )
  const addBehaviour: BlokkliDefinitionAddBehaviour =
    definition?.editor?.addBehaviour || 'form'
  if (
    definition?.editor?.disableEdit ||
    addBehaviour === 'no-form' ||
    addBehaviour.startsWith('editable:') ||
    !adapter.formFrameBuilder
  ) {
    await state.mutateWithLoadingState(() =>
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
  items: Array<DraggableExistingBlock | DraggableExistingStructureBlock>,
  host: BlokkliItemHost,
  afterUuid: string | null,
) => {
  const uuids = items.map((v) => v.block.uuid)
  await state.mutateWithLoadingState(() =>
    adapter.moveMultipleBlocks({
      uuids,
      afterUuid,
      host,
    }),
  )
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
}

const onDropReusable = async (
  item: DraggableReusableItem,
  host: BlokkliItemHost,
  afterUuid: string | null,
) => {
  if (adapter.addLibraryItem) {
    await state.mutateWithLoadingState(() =>
      adapter.addLibraryItem!({
        libraryItemUuid: item.libraryItemUuid,
        host,
        afterUuid,
      }),
    )
  }
}

const onDropClipboardItem = async (
  item: DraggableClipboardItem,
  host: BlokkliItemHost,
  afterUuid: string | null,
) => {
  eventBus.emit('drop:clipboardItem', {
    id: item.clipboardId,
    host,
    blockBundle: item.itemBundle,
    afterUuid,
  })
}

const onDropMediaLibraryItem = async (
  field: BlokkliFieldElement,
  items: DraggableMediaLibraryItem[],
  host: BlokkliItemHost,
  afterUuid: string | null,
  bundle: string | null,
) => {
  // We can assume that all media library items are of the same bundle, since it's not possible to multi select media library items of different bundles.
  const allSameBundles =
    [...new Set(items.map((v) => v.mediaBundle)).values()].length === 1
  if (!allSameBundles) {
    throw new Error(
      'Multi select of media library items of different bundles is not supported.',
    )
  }

  let targetBundle = bundle

  if (targetBundle === null) {
    const item = items[0]!
    const allowedBundles = field.allowedBundles
    const possibleBundles = allowedBundles.filter((bundle) =>
      item.itemBundles.includes(bundle),
    )
    if (possibleBundles.length === 0) {
      throw new Error('This search item can not be placed here.')
    } else if (possibleBundles.length === 1) {
      targetBundle = possibleBundles[0]!
    } else {
      bundleSelectorData.value = {
        bundles: possibleBundles,
        anchorCoordinates: getAnchorCoordinates(),
        item: items,
        host,
        afterUuid,
        field,
      }
      return
    }
  }

  if (adapter.mediaLibraryAddBlock && items.length === 1) {
    await state.mutateWithLoadingState(() =>
      adapter.mediaLibraryAddBlock!({
        preceedingUuid: afterUuid,
        host,
        item: items[0]!,
        targetBundle,
      }),
    )
  } else if (adapter.mediaLibraryAddBlocks && items.length > 1) {
    await state.mutateWithLoadingState(() =>
      adapter.mediaLibraryAddBlocks!({
        preceedingUuid: afterUuid,
        host,
        items,
        targetBundle,
      }),
    )
  }
}

function getAnchorCoordinates() {
  return ui.toArtboardCoords({
    x: mouseX.value,
    y: mouseY.value,
  })
}

const onDropSearchContentItem = async (
  field: BlokkliFieldElement,
  item: DraggableSearchContentItem,
  host: BlokkliItemHost,
  afterUuid: string | null,
) => {
  if (!adapter.addContentSearchItem) {
    throw new Error('Adapter does not implement "addContentSearchItem".')
  }

  const allowedBundles = field.allowedBundles
  const possibleBundles = allowedBundles.filter((bundle) =>
    item.itemBundles.includes(bundle),
  )

  if (possibleBundles.length === 0) {
    throw new Error('This search item can not be placed here.')
  } else if (possibleBundles.length === 1) {
    await state.mutateWithLoadingState(() =>
      adapter.addContentSearchItem!({
        item: item.searchItem,
        host,
        bundle: possibleBundles[0]!,
        afterUuid,
      }),
    )
  } else {
    bundleSelectorData.value = {
      bundles: possibleBundles,
      anchorCoordinates: getAnchorCoordinates(),
      field,
      item,
      host,
      afterUuid,
    }
  }
}

const onDropAction = (
  action: DraggableActionItem,
  host: BlokkliItemHost,
  field: BlokkliFieldElement,
  afterUuid: string | null,
) => {
  action.action.callback({
    preceedingUuid: afterUuid,
    host,
    field,
  })
}

let allUuidsBefore: string[] = []

const onDrop = async (e: DropTargetEvent) => {
  allUuidsBefore = state.getAllUuids()

  await nextTick(async () => {
    const afterUuid = e.preceedingUuid ?? null
    const host = e.host
    const typed = filterItemType(e.items)
    if (
      typed.itemType === 'existing' ||
      typed.itemType === 'existing_structure'
    ) {
      await onDropExisting(typed.items, host, afterUuid)
    } else if (typed.itemType === 'new') {
      await onDropNew(typed.item.itemBundle, host, afterUuid)
    } else if (typed.itemType === 'reusable') {
      await onDropReusable(typed.item, host, afterUuid)
    } else if (typed.itemType === 'clipboard') {
      await onDropClipboardItem(typed.item, host, afterUuid)
    } else if (typed.itemType === 'search_content') {
      await onDropSearchContentItem(e.field, typed.item, host, afterUuid)
    } else if (typed.itemType === 'action') {
      onDropAction(typed.item, host, e.field, afterUuid)
    } else if (typed.itemType === 'media_library') {
      await onDropMediaLibraryItem(e.field, typed.items, host, afterUuid, null)
    }

    eventBus.emit('dragging:end')
    eventBus.emit('item:dropped')
  })

  mouseX.value = 0
  mouseY.value = 0
}

onBlokkliEvent('state:reloaded', async function () {
  if (!allUuidsBefore.length) {
    return
  }
  const allUuidsAfter = state.getAllUuids()
  const newUuid = allUuidsAfter.find((uuid) => !allUuidsBefore.includes(uuid))
  allUuidsBefore = []

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

  // if (typed.itemType !== 'new') {
  //   return
  // }

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

const onMouseUp = (e: MouseEvent) => {
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

onBlokkliEvent('block:append', (e) => {
  allUuidsBefore = state.getAllUuids()
  // @todo: scroll into view
  onDropNew(e.bundle, e.host, e.afterUuid)
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
