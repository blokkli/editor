<template>
  <Toolbar
    v-if="currentUnit"
    :current-unit
    :current-item="currentUnit.item"
    :unit-index="currentIndex + 1"
    :total-units="units.length"
    :segment-index="segmentIndex"
    :selected
    :reasons
    :apply-label
    :show-reason="showReason"
    @update:selected="onUpdateSelected"
    @update:reasons="onUpdateReasons"
    @apply="onApply"
    @cancel="emit('cancel')"
    @prev="prev"
    @next="next"
  />

  <Highlight
    ref="highlight"
    v-model="currentIndex"
    :items
    :units
    :selected
    :insertions-only
    @toggle="onToggle"
  />
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  useTemplateRef,
  useBlokkli,
  onBeforeUnmount,
} from '#imports'
import Toolbar from './Toolbar/index.vue'
import Highlight from './Highlight/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import type { ApprovalItem, ApprovalUnit } from './types'
import { unitsFromItems } from './types'

const props = defineProps<{
  items: ApprovalItem[]
  /**
   * Whether to show the per-unit rejection reason input.
   *
   * Used by the agent tools to feed feedback back to the LLM. Leave it off when
   * changes are applied directly with no agent loop.
   */
  showReason?: boolean

  /**
   * Render new values entirely as insertions (<ins>) instead of a diff
   * against the original.
   *
   * For features like translation the new text bears little resemblance to the
   * original, so a word-level diff is just noise. Enabling this shows the new
   * value as a single insertion in the preview.
   */
  insertionsOnly?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'apply',
    data: {
      /**
       * Acceptance keyed by unit. For unsegmented items the key is the
       * stringified item id; for segmented items it's `${itemId}:${segmentId}`.
       */
      selected: Record<string, boolean>
      reasons: Record<string, string>
    },
  ): void
  (e: 'cancel'): void
}>()

const { $t, ui, eventBus, directive, context, blocks } = useBlokkli()

const highlight = useTemplateRef('highlight')

function resolveHost(uuid: string): EntityContext | null {
  if (uuid === context.value.entityUuid) {
    return {
      type: context.value.entityType,
      bundle: context.value.entityBundle,
      uuid,
    }
  }
  const block = blocks.getBlock(uuid)
  if (!block) return null
  return { type: itemEntityType, bundle: block.bundle, uuid }
}

function getItemRect(item: ApprovalItem): { x: number; y: number } | null {
  const host = resolveHost(item.uuid)
  if (!host) return null
  const el = directive.findEditableElement(item.fieldName, host)
  if (!el) return null
  return ui.getAbsoluteElementRect(el)
}

// Sort items once by visual position (top to bottom, left to right). Segments
// inside an item stay in reading order via `unitsFromItems`.
const items = [...props.items].sort((a, b) => {
  const rectA = getItemRect(a)
  const rectB = getItemRect(b)
  if (!rectA || !rectB) return 0
  const dy = rectA.y - rectB.y
  if (dy !== 0) return dy
  return rectA.x - rectB.x
})

const units = computed<ApprovalUnit[]>(() => unitsFromItems(items))

const currentIndex = ref(0)

const currentUnit = computed<ApprovalUnit | null>(() => {
  return units.value.at(currentIndex.value) ?? null
})

/** 1-based segment index within the current field. 0 when not segmented. */
const segmentIndex = computed(() => {
  const unit = currentUnit.value
  if (!unit || unit.kind !== 'segment') return 0
  const fieldUnits = units.value.filter(
    (u) => u.kind === 'segment' && u.item.id === unit.item.id,
  )
  return fieldUnits.findIndex((u) => u.key === unit.key) + 1
})

const selected = reactive<Record<string, boolean>>(
  Object.fromEntries(units.value.map((u) => [u.key, true])),
)
const reasons = reactive<Record<string, string>>(
  Object.fromEntries(units.value.map((u) => [u.key, ''])),
)

const selectedCount = computed(
  () => units.value.filter((u) => selected[u.key]).length,
)

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', units.value.length.toString())
})

function onUpdateSelected(key: string, value: boolean) {
  selected[key] = value
  nextTick(() => highlight.value?.updateRects())
}

function onToggle(key: string) {
  onUpdateSelected(key, !selected[key])
}

function onUpdateReasons(key: string, value: string) {
  reasons[key] = value
}

function onApply() {
  // Reset accepted items' editables to their original Vue-tracked DOM BEFORE
  // notifying the consumer (see Highlight/Item.vue for the rationale).
  highlight.value?.commitSelected()
  emit('apply', {
    selected: { ...selected },
    reasons: { ...reasons },
  })
}

function scrollToUnit(unit: ApprovalUnit) {
  const host = resolveHost(unit.item.uuid)
  if (host) {
    const fieldEl = directive.findEditableElement(unit.item.fieldName, host)
    if (fieldEl) {
      // For segment units, scroll the specific chunk element into view via the
      // data-chunk-index marker rendered by `renderSegmentDiff`. Falls back to
      // the field root when the marker isn't there yet (preview still pending).
      let target: HTMLElement = fieldEl
      if (unit.kind === 'segment') {
        const segEl = fieldEl.querySelector<HTMLElement>(
          `[data-chunk-index="${CSS.escape(unit.segment.id)}"]`,
        )
        if (segEl) target = segEl
      }
      eventBus.emit('scrollIntoView', { element: target, immediate: false })
      return
    }
  }
  eventBus.emit('scrollIntoView', { uuid: unit.item.uuid, immediate: false })
}

function prev() {
  const total = units.value.length
  if (total === 0) return
  currentIndex.value = (currentIndex.value - 1 + total) % total
  const u = units.value[currentIndex.value]
  if (u) scrollToUnit(u)
}

function next() {
  const total = units.value.length
  if (total === 0) return
  currentIndex.value = (currentIndex.value + 1) % total
  const u = units.value[currentIndex.value]
  if (u) scrollToUnit(u)
}

onBlokkliEvent('keyPressed', (e) => {
  if ((e.code === 'Tab' && !e.shift) || e.code === 'ArrowDown') {
    e.originalEvent.preventDefault()
    next()
  } else if ((e.code === 'Tab' && e.shift) || e.code === 'ArrowUp') {
    e.originalEvent.preventDefault()
    prev()
  } else if (e.code === ' ') {
    e.originalEvent.preventDefault()
    const u = units.value[currentIndex.value]
    if (u) {
      onUpdateSelected(u.key, !selected[u.key])
    }
  }
})

onBlokkliEvent('editable:focus', (e) => {
  // Jump to the first unit belonging to the focused field — for unsegmented
  // items that's the field itself, for segmented items it's the first changed
  // segment, which is the most useful entry point.
  const idx = units.value.findIndex(
    (u) => u.item.fieldName === e.fieldName && u.item.uuid === e.uuid,
  )
  if (idx !== -1) {
    currentIndex.value = idx
  }
})

onMounted(async () => {
  ui.setIsApproving(true)
  await nextTick()
  const first = units.value[0]
  if (first) {
    scrollToUnit(first)
  }
})

onBeforeUnmount(() => {
  ui.setIsApproving(false)
  // Each Item restores its own preview overlay on unmount (re-inserting the
  // original Vue-managed nodes), so no global cleanup is needed here.
})
</script>
