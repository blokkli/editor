<template>
  <Toolbar
    v-if="currentUnit && !editing"
    :current-unit
    :current-item="currentUnit.item"
    :unit-index="currentIndex + 1"
    :total-units="units.length"
    :segment-index="segmentIndex"
    :selected
    :reasons
    :apply-label
    :show-reason="showReason"
    :can-edit="canEditCurrent"
    @update:selected="onUpdateSelected"
    @update:reasons="onUpdateReasons"
    @apply="onApply"
    @cancel="emit('cancel')"
    @prev="prev"
    @next="next"
    @edit="startEdit"
  />

  <Highlight
    ref="highlight"
    v-model="currentIndex"
    :items
    :units
    :selected
    :insertions-only
    :editable-item-ids="editableItemIds"
    @toggle="onToggle"
    @edit="startEdit"
  />

  <Teleport v-if="editing" :to="ui.mainLayoutElement.value">
    <EditableOverlay
      :key="`${editing.item.uuid}:${editing.item.fieldName}`"
      :field-name="editing.item.fieldName"
      :host="editing.host"
      :element="editing.element"
      :config="editing.config"
      :value="editing.seed"
      controlled
      @save="onEditSave"
      @close="onEditClose"
    />
  </Teleport>
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
import EditableOverlay from '#blokkli/editor/features/editable-field/Overlay/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import type { EditableFieldConfig } from '#blokkli/editor/features/editable-field/types'
import { flattenSegments, reassembleValue } from '#blokkli/editor/helpers/diff'
import type { ApprovalItem, ApprovalUnit, DiffApplyPayload } from './types'
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

  /**
   * Offer an "Edit" action that lets the user manually revise a suggested
   * value in the editable-field overlay before applying. Editing always
   * operates on the whole field; after a manual edit the item's chunk-level
   * units collapse into a single whole-field unit.
   */
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', data: DiffApplyPayload): void
  (e: 'cancel'): void
}>()

const { $t, ui, eventBus, directive, context, blocks, types, adapter } =
  useBlokkli()

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
const sortedItems = [...props.items].sort((a, b) => {
  const rectA = getItemRect(a)
  const rectB = getItemRect(b)
  if (!rectA || !rectB) return 0
  const dy = rectA.y - rectB.y
  if (dy !== 0) return dy
  return rectA.x - rectB.x
})

// Values the user manually revised, keyed by item id. An edited item collapses
// to a single whole-field unit: its value is replaced and its segments (and
// with them all chunk-level toggles) are dropped.
const editedValues = reactive<Record<number, string>>({})

const items = computed<ApprovalItem[]>(() =>
  sortedItems.map((item) =>
    editedValues[item.id] === undefined
      ? item
      : { ...item, value: editedValues[item.id]!, segments: undefined },
  ),
)

const units = computed<ApprovalUnit[]>(() => unitsFromItems(items.value))

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

type EditingState = {
  item: ApprovalItem
  host: EntityContext
  element: HTMLElement
  config: EditableFieldConfig
  seed: string
}

/** The active manual-edit session, if any. */
const editing = ref<EditingState | null>(null)

/**
 * Resolve the editable field config for an item, or null when the item's field
 * can't be manually edited. Routing is based on the field's *config* type, not
 * the collapsed plain/markup diff type: `plain` uses the textarea input,
 * `frame` the backend-rendered editor (requires `buildEditableFrameUrl`).
 * `markup` and `table` are never editable here.
 */
function editConfigForItem(item: ApprovalItem): EditableFieldConfig | null {
  const host = resolveHost(item.uuid)
  if (!host) return null
  const config = types.editableFieldConfig.forName(
    host.type,
    host.bundle,
    item.fieldName,
  )
  if (!config) return null
  if (config.type === 'plain') return config
  if (config.type === 'frame') {
    return adapter.buildEditableFrameUrl ? config : null
  }
  return null
}

const canEditCurrent = computed(() => {
  if (!props.editable) return false
  const unit = currentUnit.value
  if (!unit) return false
  return !!editConfigForItem(unit.item)
})

/** Per-item editability for the Highlight pills. */
const editableItemIds = computed<Record<number, boolean>>(() => {
  if (!props.editable) return {}
  return Object.fromEntries(
    items.value.map((item) => [item.id, !!editConfigForItem(item)]),
  )
})

/** Per-segment acceptance for the item, derived from `selected`. */
function acceptedByIdFor(item: ApprovalItem): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!item.segments) return out
  for (const atom of flattenSegments(item.segments)) {
    out[atom.id] = selected[`${item.id}:${atom.id}`] !== false
  }
  return out
}

function startEdit() {
  if (editing.value) return
  const unit = currentUnit.value
  if (!unit) return
  const item = unit.item
  const config = editConfigForItem(item)
  const host = resolveHost(item.uuid)
  if (!config || !host) return
  // Fields without an editable element (prop-mapped only) anchor the overlay
  // to the block's root element instead — the same fallback the highlight
  // uses. The element is purely an anchor here: the overlay is seeded from
  // `value` and the live preview goes through the props-based override.
  const element =
    directive.findEditableElement(item.fieldName, host) ??
    (host.type === itemEntityType
      ? document.querySelector<HTMLElement>(
          `[data-bk-uuid="${CSS.escape(item.uuid)}"]`,
        )
      : null)
  if (!element) return
  // Seed with the value as currently decided: accepted chunks show the
  // proposed text, rejected chunks the original text.
  const seed = item.segments
    ? reassembleValue(item.segments, acceptedByIdFor(item))
    : item.value
  // Restore the field's original DOM synchronously BEFORE the overlay mounts,
  // so the overlay's own override captures a clean field.
  highlight.value?.beginEdit(item.id)
  editing.value = { item, host, element, config, seed }
}

function onEditSave(value: string) {
  const current = editing.value
  if (!current) return
  // No-op edit: keep segments and chunk decisions as they were. This also
  // absorbs pure normalization echoes from the backend editor.
  if (value === current.seed) return
  const item = current.item
  editedValues[item.id] = value
  // Seed the whole-field unit's decision state: for previously segmented
  // items the key doesn't exist yet and would read as unselected.
  selected[String(item.id)] = true
  if (reasons[String(item.id)] === undefined) {
    reasons[String(item.id)] = ''
  }
}

async function onEditClose() {
  const current = editing.value
  if (!current) return
  editing.value = null
  // Wait for the (possibly collapsed) item to propagate to the Highlight
  // items before re-rendering the diff preview from it.
  await nextTick()
  highlight.value?.endEdit(current.item.id)
  const idx = units.value.findIndex((u) => u.item.id === current.item.id)
  if (idx !== -1) {
    currentIndex.value = idx
  }
  highlight.value?.updateRects()
}

function onApply() {
  // Reset accepted items' editables to their original Vue-tracked DOM BEFORE
  // notifying the consumer (see Highlight/Item.vue for the rationale).
  highlight.value?.commitSelected()
  emit('apply', {
    selected: { ...selected },
    reasons: { ...reasons },
    edited: Object.fromEntries(
      Object.entries(editedValues).map(([id, value]) => [id, value]),
    ),
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
  // While a manual edit is open, all keys belong to the overlay.
  if (editing.value) return
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
  if (editing.value) return
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
