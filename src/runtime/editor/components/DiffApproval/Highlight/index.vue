<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      class="bk absolute top-0 left-0 pointer-events-auto origin-top-left"
      :style="containerStyle"
    >
      <Stop
        v-for="stop in renderOrder"
        :key="stop.key"
        :stop
        :rect="rects[stop.key] ?? HIDDEN_RECT"
        :selected="!!selected[stop.key]"
        :is-active="activeKey === stop.key"
        :hidden="isEditing(stop)"
        :can-edit="editableStopKeys?.[stop.key]"
        @activate="onActivate(stop.key)"
        @toggle="emit('toggle', stop.key)"
        @edit="emit('edit')"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { ApprovalStop, StopRect } from '../types'
import type { ApprovalOverrides } from '../useApprovalOverrides'
import Stop from './Stop.vue'

const props = defineProps<{
  stops: ApprovalStop[]
  /** Acceptance keyed by stop key, aggregated by the owner. */
  selected: Record<string, boolean>
  /** Resolves each item's highlight anchor. */
  overrides: ApprovalOverrides
  /** Per-stop editability — shows the Edit button on the active stop's pill. */
  editableStopKeys?: Record<string, boolean>
  /** The item currently open in the manual-edit overlay, if any. */
  editingItemId?: number | null
}>()

const emit = defineEmits<{
  (e: 'toggle', key: string): void
  (e: 'edit'): void
}>()

const activeIndex = defineModel<number>({ default: -1 })

const { ui } = useBlokkli()

const containerStyle = computed(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})

const activeKey = computed<string | null>(() => {
  return props.stops.at(activeIndex.value)?.key ?? null
})

function onActivate(key: string) {
  const idx = props.stops.findIndex((s) => s.key === key)
  if (idx !== -1) activeIndex.value = idx
}

function isEditing(stop: ApprovalStop): boolean {
  const itemId = props.editingItemId
  if (itemId === null || itemId === undefined) return false
  return stop.units.some((unit) => unit.item.id === itemId)
}

const HIDDEN_RECT: StopRect = {
  width: '0',
  height: '0',
  transform: '',
  visibility: 'hidden',
}

const rects = ref<Record<string, StopRect>>({})

/**
 * Paint order. Rectangles are absolutely-positioned siblings with no `z-index`,
 * so later ones paint — and are hit-tested — on top. Ordering by containment
 * therefore makes the innermost rectangle win the click, which is the whole
 * point: a block-level group rectangle encloses the field rectangles inside it,
 * and without this it swallows every click meant for them.
 *
 * Separate from `props.stops`, which is reading order and drives navigation.
 */
const renderOrder = ref<ApprovalStop[]>([])

function computeRect(el: HTMLElement): StopRect {
  const r = ui.getAbsoluteElementRect(el)
  const pad = 5
  return {
    width: r.width + pad * 2 + 'px',
    height: r.height + pad * 2 + 'px',
    transform: `translate(${r.x - pad}px, ${r.y - pad}px)`,
  }
}

/**
 * The element a stop's rectangle is drawn on. Checking `kind` before falling
 * back is load-bearing: a segmented field without its own element has every
 * chunk behind one block anchor, and returning that anchor per chunk drew a
 * stack of identical rectangles.
 */
function resolveStopElement(stop: ApprovalStop): HTMLElement | null {
  const unit = stop.units[0]
  if (!unit) return null
  const anchor = props.overrides.anchorElement(unit.item.id)
  if (!anchor) return null
  if (stop.kind !== 'segment' || unit.kind !== 'segment') return anchor
  return anchor.querySelector<HTMLElement>(
    `[data-chunk-index="${CSS.escape(unit.segment.id)}"]`,
  )
}

/**
 * Containment rank. The hierarchy is exactly three levels — block or provider
 * root ⊇ field element ⊇ chunk element — so the kind captures it directly,
 * with nested blocks tie-broken by how many blocks enclose them.
 *
 * Ranking by raw DOM depth instead would also reorder chunk rectangles (a
 * `<ul><li>` sits a level deeper than a sibling `<p>`), tying their order to
 * authored markup for no benefit.
 *
 * Known gap: a block nested inside another block's editable field element
 * inverts containment. Pathological in practice.
 */
const KIND_RANK = { group: 0, whole: 1_000_000, segment: 2_000_000 } as const

function rankOf(stop: ApprovalStop, el: HTMLElement | null): number {
  if (stop.kind !== 'group') return KIND_RANK[stop.kind]
  let depth = 0
  let node = el?.parentElement ?? null
  while (node) {
    if (node.hasAttribute('data-bk-uuid')) depth++
    node = node.parentElement
  }
  return depth
}

function updateRects() {
  const nextRects: Record<string, StopRect> = {}
  const ranked: Array<{ stop: ApprovalStop; rank: number }> = []

  for (const stop of props.stops) {
    const el = resolveStopElement(stop)
    nextRects[stop.key] = el ? computeRect(el) : HIDDEN_RECT
    ranked.push({ stop, rank: rankOf(stop, el) })
  }

  rects.value = nextRects
  // Stable, so stops of equal rank keep reading order.
  renderOrder.value = ranked
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.stop)
}

updateRects()

defineExpose({ updateRects })

let lastFullUpdate = 0

onBlokkliEvent('animationFrame', (ctx) => {
  if (props.editingItemId !== null && props.editingItemId !== undefined) return
  // Refresh every 1s to track viewport changes. Chunk rectangles are excluded:
  // querying N chunk elements per second adds up and they barely drift on their
  // own — they get recomputed on every toggle anyway. Group rectangles ARE
  // included even when their units are chunks, because they all share one
  // anchor (so it's one measurement, not N) and because their preview goes
  // through a reactive prop whose relayout can land after the toggle's own
  // measurement, leaving the group's only toggle offset and unclickable.
  const forceRefresh = ctx.time - lastFullUpdate > 1000
  if (!forceRefresh) return
  lastFullUpdate = ctx.time

  const next = { ...rects.value }
  let changed = false
  for (const stop of props.stops) {
    if (stop.kind === 'segment') continue
    const el = resolveStopElement(stop)
    next[stop.key] = el ? computeRect(el) : HIDDEN_RECT
    changed = true
  }
  if (changed) {
    rects.value = next
  }
})
</script>
