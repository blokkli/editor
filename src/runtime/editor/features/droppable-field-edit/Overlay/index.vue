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
      <div class="bg-white">
        <div
          v-for="(item, i) in localItems"
          :key="item.key"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center relative border-b border-b-mono-200 last:border-b-0"
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
            class="flex items-center gap-5 px-8 py-5 cursor-grab touch-none active:cursor-grabbing"
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
      </div>
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
        {{ $t('droppableFieldOpenLibrary', 'Media Library') }}
      </button>
    </div>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import type { EntityContext } from '#blokkli/types'
import { ArtboardTooltip, Icon } from '#blokkli/editor/components'
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
  label: string
  thumbnailSrc: string | null
} & ({ type: 'existing'; uuid: string } | { type: 'new'; mediaId: string })

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
  $t('droppableFieldEditLabel', 'Edit @label').replace(
    '@label',
    props.config.label,
  ),
)

const hasChanged = computed(() => {
  if (localItems.value.length !== originalItems.value.length) return true
  return localItems.value.some((item, i) => {
    const orig = originalItems.value[i]
    if (!orig) return true
    if (item.type === 'new') return true
    if (orig.type === 'new') return true
    return item.uuid !== orig.uuid
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

function onExternalPointerMove(e: PointerEvent) {
  externalDropIndex.value = computeDropIndex(e.clientY)
}

watch(showExternalDropTargets, (active) => {
  if (active) {
    snapshotIndicatorRects()
    document.addEventListener('pointermove', onExternalPointerMove)
  } else {
    externalDropIndex.value = null
    document.removeEventListener('pointermove', onExternalPointerMove)
  }
})

function onListPointerUp(e: PointerEvent) {
  if (!showExternalDropTargets.value) return
  const items = selection.dragItems.value
  if (items.length !== 1) return
  const item = items[0]!
  if (item.itemType !== 'media_library') return

  snapshotIndicatorRects()
  const position = computeDropIndex(e.clientY)

  eventBus.emit('dragging:end')
  pushUndo()
  const newItem: LocalItem = {
    key: `new-${Date.now()}`,
    type: 'new',
    mediaId: item.mediaId,
    label: item.label,
    thumbnailSrc: item.thumbnailSrc ?? null,
  }
  const newList = [...localItems.value]
  newList.splice(position, 0, newItem)
  localItems.value = newList
}

async function loadItems() {
  const items = await adapter.getDroppableFieldItems!({ host: host.value })
  localItems.value = items.map((item) => ({
    key: item.uuid,
    type: 'existing' as const,
    uuid: item.uuid,
    label: item.label,
    thumbnailSrc: item.thumbnailSrc ?? null,
  }))
  originalItems.value = [...localItems.value]
}

function isNoOpDrop(from: number, to: number): boolean {
  return to === from || to === from + 1
}

// Snapshotted indicator Y positions, computed on drag start.
let indicatorYPositions: number[] = []

function snapshotIndicatorRects() {
  if (!listEl.value) {
    indicatorYPositions = []
    return
  }
  const indicators = listEl.value.querySelectorAll(
    '.bk-droppable-field-edit-indicator',
  )
  indicatorYPositions = Array.from(indicators).map((el) => {
    const rect = el.getBoundingClientRect()
    return rect.top + rect.height / 2
  })
}

function computeDropIndex(pointerY: number): number {
  let closest = 0
  let closestDist = Infinity
  for (let i = 0; i < indicatorYPositions.length; i++) {
    const dist = Math.abs(pointerY - indicatorYPositions[i]!)
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

function removeGhost() {
  if (ghostEl) {
    ghostEl.remove()
    ghostEl = null
  }
}

function onDocumentPointerMove(e: PointerEvent) {
  if (dragIndex.value === null) {
    return
  }
  dropIndex.value = computeDropIndex(e.clientY)
  if (ghostEl) {
    ghostEl.style.left = `${e.clientX - ghostOffsetX}px`
    ghostEl.style.top = `${e.clientY - ghostOffsetY}px`
  }
}

function onDocumentPointerUp() {
  document.removeEventListener('pointermove', onDocumentPointerMove)
  document.removeEventListener('pointerup', onDocumentPointerUp)
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
  if (props.config.cardinality === 1) {
    return
  }
  e.preventDefault()

  dragIndex.value = index
  dropIndex.value = index
  snapshotIndicatorRects()

  // Create ghost from the drag-handle element (the pointerdown target).
  const target = e.currentTarget
  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect()
    ghostOffsetX = e.clientX - rect.left
    ghostOffsetY = e.clientY - rect.top
    const clone = cloneWithInlineStyles(target) as HTMLElement
    clone.style.position = 'fixed'
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.pointerEvents = 'none'
    clone.style.zIndex = '999999'
    clone.style.background = 'white'
    clone.style.opacity = '0.8'
    document.body.appendChild(clone)
    ghostEl = clone
  }

  document.addEventListener('pointermove', onDocumentPointerMove)
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
    const items = localItems.value.map((item) =>
      item.type === 'existing'
        ? { type: 'existing' as const, uuid: item.uuid }
        : { type: 'new' as const, mediaId: item.mediaId },
    )
    await state.mutateWithLoadingState(
      () => adapter.updateDroppableField!({ host: host.value, items }),
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

onBlokkliEvent('window:clickAway', save)

onMounted(() => {
  keyboard.lockKeyboardEvents(KEYBOARD_LOCK_ID)
  document.addEventListener('keydown', onKeyDown, true)
  loadItems()
})

onBeforeUnmount(() => {
  keyboard.unlockKeyboardEvents(KEYBOARD_LOCK_ID)
  document.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('pointermove', onExternalPointerMove)
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
