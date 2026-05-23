<template>
  <ArtboardTooltip
    id="droppable-field"
    :title="title"
    :anchor-el="element"
    placement-y="top"
    class="bk-droppable-field-edit"
    close-icon="bk_mdi_check"
    :close-disabled="!canConfirm"
    @close="save"
  >
    <div
      ref="listEl"
      class="w-[680px] max-h-300 overflow-y-auto p-10 bg-mono-200"
      @pointerup="onListPointerUp"
    >
      <GrowOnly class="bg-white">
        <div
          v-for="(item, i) in localItems"
          :key="item.key"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center relative border-b border-b-mono-200 last:border-b-0 bg-white"
        >
          <div
            v-if="i === 0"
            class="bk-droppable-field-edit-indicator col-span-2"
            :class="{
              'bk-is-visible':
                (dragIndex !== null && dragIndex !== 0) ||
                showExternalDropTargets,
              'bk-is-active': activeIndicator === 0,
            }"
          />
          <div
            class="flex items-center gap-5 px-8 py-5 cursor-grab touch-none active:cursor-grabbing bg-white"
            :class="{ 'opacity-30': dragIndex === i }"
            @pointerdown="onPointerDown($event, i)"
          >
            <div
              class="size-50 rounded overflow-hidden flex items-center justify-center bg-mono-100 shrink-0 [&_img]:size-full [&_img]:object-cover [&_svg]:size-18 [&_svg]:fill-current [&_svg]:text-mono-400"
            >
              <img v-if="item.thumbnailSrc" :src="item.thumbnailSrc" alt="" />
              <Icon v-else name="bk_mdi_image" />
            </div>
            <span class="flex-1 min-w-0 truncate text-sm text-mono-800">
              {{ item.label }}
            </span>
          </div>
          <button
            type="button"
            class="size-25 mr-8 flex items-center justify-center rounded shrink-0 text-mono-400 hover:bg-red-light hover:text-red-dark disabled:opacity-30 disabled:pointer-events-none [&_svg]:size-[14px] [&_svg]:fill-current"
            @click.stop.prevent="removeItem(i)"
          >
            <Icon name="bk_mdi_close" />
          </button>
          <div
            class="bk-droppable-field-edit-indicator col-span-2"
            :class="{
              'bk-is-visible':
                (dragIndex !== null &&
                  i + 1 !== dragIndex &&
                  i + 1 !== dragIndex + 1) ||
                showExternalDropTargets,
              'bk-is-active': activeIndicator === i + 1,
            }"
          />
        </div>

        <div
          v-if="canAddMore"
          class="flex items-center gap-5 p-8 text-sm text-mono-400 [&_svg]:size-18 [&_svg]:fill-current [&_svg]:shrink-0"
        >
          <Icon name="bk_mdi_image" />
          {{ $t('droppableFieldDropHint', 'Drop image here') }}
        </div>

        <div
          v-if="config.required && localItems.length === 0"
          class="flex items-center gap-5 p-8 text-sm text-red-dark bg-red-light [&_svg]:size-18 [&_svg]:fill-current [&_svg]:shrink-0"
        >
          <Icon name="bk_mdi_warning" />
          {{
            $t(
              'droppableFieldRequiredWarning',
              'This field is required. Add an item before saving, or press Discard to abort.',
            )
          }}
        </div>
      </GrowOnly>
    </div>

    <div class="bk-artboard-tooltip-info">
      <button
        class="bk-artboard-tooltip-info-button bk-scheme-red"
        :disabled="!hasChanged"
        @click.prevent="discard"
      >
        {{ $t('editableFieldDiscard', 'Discard') }}
      </button>
      <button
        :disabled="!undoStack.length"
        class="bk-artboard-tooltip-info-button bk-scheme-mono relative group/tooltip"
        @click.prevent="undo"
      >
        <Icon name="bk_mdi_undo" />
      </button>
      <button
        :disabled="!redoStack.length"
        class="bk-artboard-tooltip-info-button bk-scheme-mono relative group/tooltip"
        @click.prevent="redo"
      >
        <Icon name="bk_mdi_redo" />
      </button>
      <div class="px-10 text-sm text-mono-600 mr-auto">
        <template v-if="config.cardinality > 0">
          {{
            $t('droppableFieldRemaining', '@count remaining').replace(
              '@count',
              String(config.cardinality - localItems.length),
            )
          }}
        </template>
        <template v-else>
          {{
            $t('droppableFieldItemCount', '@count items').replace(
              '@count',
              String(localItems.length),
            )
          }}
        </template>
      </div>
      <button
        v-if="canAddMore"
        class="bk-artboard-tooltip-info-button bk-scheme-mono relative group/tooltip"
        :disabled="ui.hasSidebarLeft.value"
        @click.prevent="onAddClick"
      >
        <Icon name="bk_mdi_image" />
        {{ $t('mediaLibrary', 'Media Library') }}
      </button>
    </div>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import type { EntityContext } from '#blokkli/types'
import { ArtboardTooltip, GrowOnly, Icon } from '#blokkli/editor/components'
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { cloneWithInlineStyles } from '#blokkli/editor/helpers/dom'
import type { DroppableFieldConfig } from '#blokkli/editor/features/editable-field/types'

const props = defineProps<{
  fieldName: string
  entity: EntityContext
  element: HTMLElement
  config: DroppableFieldConfig
}>()

const emit = defineEmits<{
  close: []
}>()

const { $t, adapter, state, eventBus, keyboard, selection, ui } = useBlokkli()

type LocalItem = {
  key: string
  id: string
  label: string
  thumbnailSrc: string | null
  entityType: string
  bundle: string
  targetBundles: string[]
}

const localItems = ref<LocalItem[]>([])
const originalItems = ref<LocalItem[]>([])
const isClosing = ref(false)

// Local undo/redo stack.
const undoStack = ref<LocalItem[][]>([])
const redoStack = ref<LocalItem[][]>([])

const KEYBOARD_LOCK_ID = 'droppable-field-edit'

function pushUndo() {
  undoStack.value.push([...localItems.value])
  redoStack.value = []
}

function undo() {
  const prev = undoStack.value.pop()
  if (prev) {
    redoStack.value.push([...localItems.value])
    localItems.value = prev
  }
}

function redo() {
  const next = redoStack.value.pop()
  if (next) {
    undoStack.value.push([...localItems.value])
    localItems.value = next
  }
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    e.stopPropagation()
    if (e.shiftKey) {
      redo()
    } else {
      undo()
    }
  }
}

// Drag reorder state.
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const externalDropIndex = ref<number | null>(null)
const listEl = useTemplateRef('listEl')

const activeIndicator = computed(() => {
  if (externalDropIndex.value !== null) return externalDropIndex.value
  if (dragIndex.value === null || dropIndex.value === null) return null
  if (isNoOpDrop(dragIndex.value, dropIndex.value)) return null
  return dropIndex.value
})

const title = computed(() =>
  $t('editLabel', 'Edit @label').replace('@label', props.config.label),
)

const hasChanged = computed(() => {
  if (localItems.value.length !== originalItems.value.length) return true
  return localItems.value.some((item, i) => {
    const orig = originalItems.value[i]
    if (!orig) return true
    return item.id !== orig.id
  })
})

const canAddMore = computed(() => {
  if (props.config.cardinality === -1) {
    return true
  }
  return localItems.value.length < props.config.cardinality
})

const canConfirm = computed(() => {
  if (!hasChanged.value) return true
  return !(props.config.required && localItems.value.length === 0)
})

const host = computed(() => ({
  type: props.entity.type,
  uuid: props.entity.uuid,
  fieldName: props.fieldName,
}))

// Show drop targets between items when an external media item is being dragged.
const showExternalDropTargets = computed(() => {
  if (!selection.isDragging.value || !canAddMore.value) {
    return false
  }
  const items = selection.dragItems.value
  if (items.length !== 1) {
    return false
  }
  const item = items[0]!
  if (item.itemType !== 'media_library') {
    return false
  }
  const allowedBundles = props.config.allowed.find(
    (v) => v.type === 'media',
  )?.bundles
  return !!allowedBundles && allowedBundles.includes(item.mediaBundle)
})

watch(showExternalDropTargets, (active) => {
  if (!active) {
    externalDropIndex.value = null
  }
})

function onListPointerUp(e: PointerEvent) {
  if (!showExternalDropTargets.value) return
  const items = selection.dragItems.value
  if (items.length !== 1) return
  const item = items[0]!
  if (item.itemType !== 'media_library') return

  const position = computeDropIndex(e.clientY)

  eventBus.emit('dragging:end')
  pushUndo()
  const newItem: LocalItem = {
    key: `new-${Date.now()}-${item.mediaId}`,
    id: item.mediaId,
    label: item.label,
    thumbnailSrc: item.thumbnailSrc ?? null,
    entityType: 'media',
    bundle: item.mediaBundle,
    targetBundles: item.itemBundles,
  }
  const newList = [...localItems.value]
  newList.splice(position, 0, newItem)
  localItems.value = newList
}

async function loadItems() {
  const items = await adapter.getDroppableFieldItems!({ host: host.value })
  localItems.value = items.map((item) => ({
    key: item.id,
    id: item.id,
    label: item.label,
    thumbnailSrc: item.thumbnailSrc ?? null,
    entityType: item.entityType,
    bundle: item.bundle,
    targetBundles: item.targetBundles,
  }))
  originalItems.value = [...localItems.value]
}

function isNoOpDrop(from: number, to: number): boolean {
  return to === from || to === from + 1
}

// Snapshotted indicator Y positions, computed on drag start.
function computeDropIndex(pointerY: number): number {
  if (!listEl.value) return 0
  const indicators = listEl.value.querySelectorAll(
    '.bk-droppable-field-edit-indicator',
  )
  let closest = 0
  let closestDist = Infinity
  for (let i = 0; i < indicators.length; i++) {
    const rect = indicators[i]!.getBoundingClientRect()
    const y = rect.top + rect.height / 2
    const dist = Math.abs(pointerY - y)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  }
  return closest
}

// Drag ghost element.
let ghostEl: HTMLElement | null = null
let ghostOffsetX = 0
let ghostOffsetY = 0

// The original drag-handle DOM element captured at pointerdown. Used as the
// drag source for the editor's drag overlay while the pointer is outside the
// list (copy semantics — we never remove the item, so this element persists
// in the DOM and can be safely read for outerHTML/rect measurements).
let dragHandleEl: HTMLElement | null = null

// Index of the item currently dragged out. Kept separate from dragIndex
// because the latter is cleared while the editor owns the drag.
let draggedOutIndex: number | null = null

function removeGhost() {
  if (ghostEl) {
    ghostEl.remove()
    ghostEl = null
  }
}

function isPointerOutsideList(x: number, y: number): boolean {
  const rect = listEl.value?.getBoundingClientRect()
  if (!rect) return false
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom
}

function createGhost(from: HTMLElement, x: number, y: number) {
  const rect = from.getBoundingClientRect()
  const clone = cloneWithInlineStyles(from) as HTMLElement
  clone.style.position = 'fixed'
  clone.style.left = `${x - ghostOffsetX}px`
  clone.style.top = `${y - ghostOffsetY}px`
  clone.style.width = `${rect.width}px`
  clone.style.pointerEvents = 'none'
  clone.style.zIndex = '999999'
  clone.style.background = 'white'
  clone.style.opacity = '0.8'
  document.body.appendChild(clone)
  ghostEl = clone
}

function beginDragOut(x: number, y: number) {
  if (dragIndex.value === null || !dragHandleEl) return
  const index = dragIndex.value
  const item = localItems.value[index]
  if (!item) return

  // Tear down internal-drag visuals. The original drag-handle element (still
  // in the DOM — copy semantics means we never splice) is handed to the
  // editor's drag overlay as the source for clone/measure.
  removeGhost()
  dragIndex.value = null
  dropIndex.value = null
  draggedOutIndex = index

  const source = dragHandleEl

  eventBus.emit('dragging:start', {
    items: [
      {
        itemType: 'droppable_field_item',
        element: () => source,
        itemBundles: item.targetBundles,
        entityId: item.id,
        entityType: item.entityType,
        entityBundle: item.bundle,
        label: item.label,
        thumbnailSrc: item.thumbnailSrc ?? undefined,
      },
    ],
    coords: { x, y },
    mode: 'mouse',
  })
}

function resumeInternalDrag(x: number, y: number) {
  if (draggedOutIndex === null || !dragHandleEl) return
  const index = draggedOutIndex
  draggedOutIndex = null

  // Cancel the editor's drag: tears down its overlay + pointer listeners.
  eventBus.emit('dragging:end')

  // Restore internal-drag state and visuals.
  dragIndex.value = index
  dropIndex.value = computeDropIndex(y)
  createGhost(dragHandleEl, x, y)
}

// Hysteresis: the pointer must stay on the "other side" of the list boundary
// for this long before we switch between internal-reorder and drag-out. Any
// opposing move during the wait cancels and restarts the clock, so small
// accidental flicks don't trigger a mode change.
const BOUNDARY_HYSTERESIS_MS = 500

let pendingSwitch: ReturnType<typeof setTimeout> | null = null
let lastPointerX = 0
let lastPointerY = 0

function cancelPendingSwitch() {
  if (pendingSwitch !== null) {
    clearTimeout(pendingSwitch)
    pendingSwitch = null
  }
}

// Single document-level pointermove dispatcher, mounted for the overlay's
// lifetime. Routes to one of the three drag phases based on current state:
//   - Internal reorder (dragIndex set): update dropIndex + move ghost, or
//     (after hysteresis) hand off to the editor when the pointer stays out.
//   - Drag-out (draggedOutIndex set): watch for re-entry and (after
//     hysteresis) resume the internal reorder.
//   - External drop (showExternalDropTargets true): update the insertion
//     indicator for an incoming media-library item.
function onPointerMove(e: PointerEvent) {
  lastPointerX = e.clientX
  lastPointerY = e.clientY

  if (dragIndex.value !== null) {
    const outside = isPointerOutsideList(e.clientX, e.clientY)
    if (outside) {
      if (pendingSwitch === null) {
        pendingSwitch = setTimeout(() => {
          pendingSwitch = null
          beginDragOut(lastPointerX, lastPointerY)
        }, BOUNDARY_HYSTERESIS_MS)
      }
    } else {
      cancelPendingSwitch()
    }
    dropIndex.value = computeDropIndex(e.clientY)
    if (ghostEl) {
      ghostEl.style.left = `${e.clientX - ghostOffsetX}px`
      ghostEl.style.top = `${e.clientY - ghostOffsetY}px`
    }
    return
  }

  if (draggedOutIndex !== null) {
    const inside = !isPointerOutsideList(e.clientX, e.clientY)
    if (inside) {
      if (pendingSwitch === null) {
        pendingSwitch = setTimeout(() => {
          pendingSwitch = null
          resumeInternalDrag(lastPointerX, lastPointerY)
        }, BOUNDARY_HYSTERESIS_MS)
      }
    } else {
      cancelPendingSwitch()
    }
    return
  }

  if (showExternalDropTargets.value) {
    externalDropIndex.value = computeDropIndex(e.clientY)
  }
}

function onDocumentPointerUp() {
  document.removeEventListener('pointerup', onDocumentPointerUp)
  cancelPendingSwitch()
  removeGhost()

  if (dragIndex.value === null || dropIndex.value === null) {
    dragIndex.value = null
    dropIndex.value = null
    return
  }

  const from = dragIndex.value
  // Indicators are: [before item 0, after item 0, after item 1, ...].
  // Indicator 0 = position 0 (before first), indicator i+1 = position i+1 (after item i).
  let to = dropIndex.value

  if (!isNoOpDrop(from, to)) {
    pushUndo()
    const items = [...localItems.value]
    const [item] = items.splice(from, 1)
    if (to > from) {
      to--
    }
    items.splice(to, 0, item!)
    localItems.value = items
  }

  dragIndex.value = null
  dropIndex.value = null
}

function onPointerDown(e: PointerEvent, index: number) {
  if (e.button !== 0) {
    return
  }
  e.preventDefault()

  const target = e.currentTarget
  if (!(target instanceof HTMLElement)) {
    return
  }

  const rect = target.getBoundingClientRect()
  ghostOffsetX = e.clientX - rect.left
  ghostOffsetY = e.clientY - rect.top

  dragHandleEl = target
  dragIndex.value = index
  dropIndex.value = index
  createGhost(target, e.clientX, e.clientY)

  document.addEventListener('pointerup', onDocumentPointerUp)
}

function removeItem(index: number) {
  pushUndo()
  localItems.value = localItems.value.filter((_, i) => i !== index)
}

function onAddClick() {
  eventBus.emit('sidebar:open', 'media_library')
}

async function save() {
  if (isClosing.value) {
    return
  }
  if (!canConfirm.value) {
    return
  }
  isClosing.value = true

  if (hasChanged.value) {
    const itemIds = localItems.value.map((item) => item.id)
    await state.mutateWithLoadingState(
      () => adapter.updateDroppableField!({ host: host.value, itemIds }),
      $t('droppableFieldSaveFailed', 'Failed to save field.'),
    )
  }

  emit('close')
}

function discard() {
  if (isClosing.value) {
    return
  }
  isClosing.value = true
  emit('close')
}

onBlokkliEvent('window:clickAway', () => {
  if (selection.isDragging.value) {
    return
  }
  save()
})

onBlokkliEvent('dragging:end', () => {
  draggedOutIndex = null
  cancelPendingSwitch()
})

onMounted(() => {
  keyboard.lockKeyboardEvents(KEYBOARD_LOCK_ID)
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('pointermove', onPointerMove)
  loadItems()
})

onBeforeUnmount(() => {
  keyboard.unlockKeyboardEvents(KEYBOARD_LOCK_ID)
  document.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onDocumentPointerUp)
  cancelPendingSwitch()
  removeGhost()
})
</script>

<style lang="postcss">
.bk.bk-droppable-field-edit {
  --bk-bg: white;
  --bk-header-bg: theme('colors.teal.normal');
  --bk-header-text: theme('colors.teal.dark');
  --bk-border: theme('colors.teal.normal');
  --bk-header-hover: rgb(var(--bk-theme-teal-dark) / 0.2);

  .bk-droppable-field-edit-indicator {
    height: 4px;

    &.bk-is-visible {
      @apply bg-teal-normal/30;
    }

    &.bk-is-active {
      @apply bg-teal-normal;
    }
  }
}
</style>
