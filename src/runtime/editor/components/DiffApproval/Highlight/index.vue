<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      class="bk absolute top-0 left-0 pointer-events-auto origin-top-left"
      :style="containerStyle"
    >
      <Item
        v-for="item in items"
        :key="item.id"
        ref="itemRefs"
        :item
        :units="unitsByItemId[item.id] ?? []"
        :selected
        :active-key
        :insertions-only
        :can-edit="editableItemIds?.[item.id]"
        @activate="(key: string) => onActivate(key)"
        @toggle="(key: string) => emit('toggle', key)"
        @edit="emit('edit')"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef, useBlokkli } from '#imports'
import type { ApprovalItem, ApprovalUnit } from '../types'
import Item from './Item.vue'

const props = defineProps<{
  items: ApprovalItem[]
  units: ApprovalUnit[]
  selected: Record<string, boolean>
  insertionsOnly?: boolean
  /** Per-item editability — shows the Edit button on the active unit's pill. */
  editableItemIds?: Record<number, boolean>
}>()

const emit = defineEmits<{
  (e: 'toggle', key: string): void
  (e: 'edit'): void
}>()

const activeIndex = defineModel<number>({ default: -1 })

const { ui } = useBlokkli()

const itemRefs = useTemplateRef('itemRefs')

const containerStyle = computed(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})

/** Group units by their owning item, in unit reading order. */
const unitsByItemId = computed<Record<number, ApprovalUnit[]>>(() => {
  const out: Record<number, ApprovalUnit[]> = {}
  for (const unit of props.units) {
    const list = out[unit.item.id] ?? []
    list.push(unit)
    out[unit.item.id] = list
  }
  return out
})

const activeKey = computed<string | null>(() => {
  return props.units.at(activeIndex.value)?.key ?? null
})

function onActivate(key: string) {
  const idx = props.units.findIndex((u) => u.key === key)
  if (idx !== -1) activeIndex.value = idx
}

function updateRects() {
  if (itemRefs.value) {
    for (const item of itemRefs.value) {
      if (!item) continue
      item.updateRects()
    }
  }
}

/**
 * Reset each accepted item's editable to its original Vue-tracked DOM, then
 * mark them committed so the post-mutation unmount-restore is a no-op. Called
 * by DiffApproval BEFORE emitting `apply`.
 */
function commitSelected() {
  if (!itemRefs.value) return
  for (const ref of itemRefs.value) {
    if (!ref) continue
    ref.commitForApply()
  }
}

// Locate by the exposed itemId — template-ref arrays from v-for don't
// guarantee source order.
function findItem(itemId: number) {
  return itemRefs.value?.find((ref) => ref?.itemId === itemId) ?? null
}

/** Restore the item's field DOM so a manual edit can begin on the original. */
function beginEdit(itemId: number) {
  findItem(itemId)?.beginEdit()
}

/** Re-render the item's diff preview after a manual edit session ended. */
function endEdit(itemId: number) {
  findItem(itemId)?.endEdit()
}

defineExpose({ updateRects, commitSelected, beginEdit, endEdit })
</script>
