<template>
  <div
    ref="container"
    class="relative"
    @dragover="onDragOver"
    @dragenter.prevent
    @drop.prevent="onDrop"
  >
    <component :is="transition ? TransitionList : 'div'">
      <slot
        v-for="(item, index) in items"
        :key="keyField ? (item[keyField] as PropertyKey) : index"
        :item
        :index
        :is-dragging="dragIndex === index"
        :handle-props="handlePropsFor(index)"
      />
    </component>
    <div
      v-if="dropIndex !== null"
      data-reorder-indicator
      class="absolute left-0 right-0 h-2 bg-accent-600 rounded-full pointer-events-none"
      :style="{ top: indicatorTop + 'px' }"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, useTemplateRef } from '#imports'
import TransitionList from '#blokkli/editor/components/Transition/List/index.vue'

/**
 * A generic, self-contained drag-and-drop reordering list.
 *
 * It is completely independent of blökkli's own drag system (eventBus,
 * DraggableItem, Sortli) and uses native HTML5 drag-and-drop. Dragging is only
 * initiated from a dedicated handle: bind the `handleProps` slot prop to the
 * element that should act as the grip, so clicks, buttons and form inputs
 * inside each row keep working.
 *
 * Slotted items are rendered as direct children of a single list element (no
 * per-item wrapper), so sibling-based CSS such as `.foo + .foo` borders keeps
 * working. Drag/drop is handled via event delegation on the container. Set
 * `transition` to animate reordering with the shared list transition.
 *
 * The component does not own the list: it renders `items` and emits a
 * `reorder` event with the source and target index. The consumer mutates its
 * own data.
 *
 * Note: native HTML5 drag-and-drop does not fire from touch input, so this is
 * mouse-only. A pointer-based variant would be needed for touch support.
 *
 * @example
 * <Reorder :items="rows" key-field="id" @reorder="onReorder">
 *   <template #default="{ item, handleProps, isDragging }">
 *     <MyRow :class="{ 'opacity-50': isDragging }">
 *       <button v-bind="handleProps">⠿</button>
 *     </MyRow>
 *   </template>
 * </Reorder>
 */
defineProps<{
  /**
   * The list to render. The component does not mutate it.
   */
  items: T[]

  /**
   * Property used as the stable `:key`. Falls back to the index.
   */
  keyField?: keyof T

  /**
   * Render the list through the shared list transition so reordering, adding
   * and removing items animate.
   */
  transition?: boolean
}>()

const emit = defineEmits<{
  (e: 'reorder', payload: { from: number; to: number }): void
}>()

const container = useTemplateRef<HTMLElement>('container')

const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const indicatorTop = ref(0)

function handlePropsFor(index: number) {
  return {
    draggable: true,
    style: 'cursor: grab; touch-action: none;',
    onDragstart: (e: DragEvent) => onDragStart(e, index),
    onDragend: () => reset(),
  }
}

/**
 * The list element wrapping the rows. It is always the container's first
 * child; the drop indicator is rendered after it.
 */
function getListEl(): HTMLElement | null {
  const el = container.value?.firstElementChild
  return el instanceof HTMLElement ? el : null
}

/**
 * The rendered item elements (direct children of the list element).
 */
function getRows(): HTMLElement[] {
  return Array.from(getListEl()?.children ?? []).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  )
}

/**
 * Walks up from the event target to the direct child of the list element, i.e.
 * the rendered slot root for the row.
 */
function rowFromTarget(target: EventTarget | null): HTMLElement | null {
  const listEl = getListEl()
  let el = target instanceof HTMLElement ? target : null
  while (el && el.parentElement !== listEl) {
    el = el.parentElement
  }
  return el
}

function onDragStart(e: DragEvent, index: number) {
  dragIndex.value = index
  if (!e.dataTransfer) {
    return
  }

  e.dataTransfer.effectAllowed = 'move'
  // Firefox only starts a drag if data is set during dragstart.
  e.dataTransfer.setData('text/plain', String(index))

  // Use the whole row as the drag ghost instead of just the handle, keeping
  // the grab point under the cursor.
  const row = rowFromTarget(e.target)
  if (row) {
    const rect = row.getBoundingClientRect()
    e.dataTransfer.setDragImage(
      row,
      e.clientX - rect.left,
      e.clientY - rect.top,
    )
  }
}

function onDragOver(e: DragEvent) {
  if (dragIndex.value === null) {
    return
  }

  // Required, otherwise the drop event never fires.
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }

  const rows = getRows()
  const containerTop = container.value?.getBoundingClientRect().top ?? 0

  // Find the insertion index by comparing the cursor against each row's
  // vertical midpoint. Defaults to the end when below every row.
  let target = rows.length
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i]!.getBoundingClientRect()
    if (e.clientY < rect.top + rect.height / 2) {
      target = i
      break
    }
  }
  dropIndex.value = target

  indicatorTop.value =
    target >= rows.length
      ? (rows[rows.length - 1]?.getBoundingClientRect().bottom ??
          containerTop) - containerTop
      : rows[target]!.getBoundingClientRect().top - containerTop
}

function onDrop() {
  const from = dragIndex.value
  let to = dropIndex.value
  reset()

  if (from === null || to === null) {
    return
  }

  // Removing the source shifts everything after it down by one.
  if (to > from) {
    to -= 1
  }

  if (to === from) {
    return
  }

  emit('reorder', { from, to })
}

function reset() {
  dragIndex.value = null
  dropIndex.value = null
}
</script>
