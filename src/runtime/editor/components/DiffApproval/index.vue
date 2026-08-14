<template>
  <Toolbar
    v-if="currentStop && !editing"
    :current-stop
    :label="currentLabel"
    :kind="currentStop.kind"
    :segment-tag="currentSegmentTag"
    :segment-index="segmentIndex"
    :is-selected="isStopSelected(currentStop)"
    :reason="currentReason"
    :stop-index="currentIndex + 1"
    :total-stops="stops.length"
    :apply-label
    :show-reason="showReason"
    :can-edit="canEditCurrent"
    @update:selected="onToolbarSelected"
    @update:reason="onToolbarReason"
    @apply="onApply"
    @cancel="emit('cancel')"
    @prev="prev"
    @next="next"
    @edit="startEdit"
  />

  <Highlight
    ref="highlight"
    v-model="currentIndex"
    :stops
    :selected="selectedByStopKey"
    :overrides
    :editable-stop-keys="editableStopKeys"
    :editing-item-id="editing?.item.id ?? null"
    @toggle="onToggleStopKey"
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
  watch,
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
import type { ApprovalItem, ApprovalStop, DiffApplyPayload } from './types'
import { stopItemIds, stopKeys, stopsFromUnits, unitsFromItems } from './types'
import { useApprovalOverrides } from './useApprovalOverrides'

const props = defineProps<{
  items: ApprovalItem[]
  /**
   * Whether to show the per-stop rejection reason input.
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
//
// Note: `getItemRect` deliberately does NOT fall back to the block element, so
// items without their own element compare equal to everything and keep their
// input order. Giving them the block's geometry would sort a block-level group
// above its own nested fields, which is not the order a reader expects — and
// paint order, which is what decides clicks, is handled separately by the
// highlight's containment ranking.
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

const effectiveItems = computed<ApprovalItem[]>(() =>
  sortedItems.map((item) =>
    editedValues[item.id] === undefined
      ? item
      : { ...item, value: editedValues[item.id]!, segments: undefined },
  ),
)

const units = computed(() => unitsFromItems(effectiveItems.value))

const selected = reactive<Record<string, boolean>>({})
const reasons = reactive<Record<string, string>>({})

// Seed state for every unit, including ones that appear later: a manual edit
// replaces an item's chunk units with a single whole-field unit whose key did
// not exist before. An unseeded key would read as rejected in the UI while
// `decideFieldUpdates` treats it as accepted.
watch(
  units,
  (list) => {
    for (const unit of list) {
      if (selected[unit.key] === undefined) selected[unit.key] = true
      if (reasons[unit.key] === undefined) reasons[unit.key] = ''
    }
  },
  { immediate: true },
)

const overrides = useApprovalOverrides({
  items: sortedItems,
  effectiveItem: (itemId) =>
    effectiveItems.value.find((item) => item.id === itemId),
  selected,
  insertionsOnly: () => !!props.insertionsOnly,
})

/**
 * Which item ids share a highlight anchor, resolved once.
 *
 * Not a `computed`: this reads the editable directive's registry, a plain
 * non-reactive Map, so a computed would track nothing and cache its first
 * answer forever. The sibling `sortedItems` snapshot works the same way, and
 * the batch is fixed for the lifetime of the approval.
 */
const groupKeys = new Map<number, string | null>(
  sortedItems.map((item) => [item.id, overrides.anchorGroupKey(item.id)]),
)

const stops = computed<ApprovalStop[]>(() =>
  stopsFromUnits(units.value, groupKeys),
)

const currentIndex = ref(0)

const currentStop = computed<ApprovalStop | null>(
  () => stops.value.at(currentIndex.value) ?? null,
)

// A manual edit can collapse several stops into one, so the index has to be
// pulled back inside the list — otherwise `currentStop` goes null and the
// toolbar unmounts, taking Cancel and Apply with it.
watch(
  () => stops.value.length,
  (total) => {
    if (total === 0) return
    if (currentIndex.value > total - 1) {
      currentIndex.value = total - 1
    }
  },
)

function stopIndexForItem(itemId: number): number {
  return stops.value.findIndex((stop) =>
    stop.units.some((unit) => unit.item.id === itemId),
  )
}

/** 1-based segment index within the current field. 0 when not a chunk stop. */
const segmentIndex = computed(() => {
  const stop = currentStop.value
  if (!stop || stop.kind !== 'segment') return 0
  const unit = stop.units[0]
  if (!unit || unit.kind !== 'segment') return 0
  const fieldUnits = units.value.filter(
    (u) => u.kind === 'segment' && u.item.id === unit.item.id,
  )
  return fieldUnits.findIndex((u) => u.key === unit.key) + 1
})

const currentSegmentTag = computed(() => {
  const unit = currentStop.value?.units[0]
  return unit?.kind === 'segment' ? unit.segment.tag : null
})

/**
 * A stop is accepted only when every change behind it is. Members of a group
 * move together, so this is exact rather than a summary — and it matches
 * `decideFieldUpdates`, which reads anything other than an explicit `false` as
 * accepted.
 */
function isStopSelected(stop: ApprovalStop): boolean {
  return (
    stop.units.length > 0 &&
    stopKeys(stop).every((key) => selected[key] !== false)
  )
}

const selectedByStopKey = computed<Record<string, boolean>>(() =>
  Object.fromEntries(
    stops.value.map((stop) => [stop.key, isStopSelected(stop)]),
  ),
)

const selectedCount = computed(
  () => stops.value.filter((stop) => isStopSelected(stop)).length,
)

const applyLabel = computed(() => {
  return $t('aiAgentBatchRewriteApply', 'Apply @count of @total')
    .replace('@count', selectedCount.value.toString())
    .replace('@total', stops.value.length.toString())
})

// A merged stop stands for several fields, so name them — but only the first
// couple, or a block with five changed fields would push the Apply button out
// of the toolbar. The overflow marker is a bare count, so it needs no
// translation.
const MAX_LABELS = 2

const currentLabel = computed(() => {
  const stop = currentStop.value
  if (!stop) return ''
  const labels: string[] = []
  for (const itemId of stopItemIds(stop)) {
    const item = effectiveItems.value.find((i) => i.id === itemId)
    if (item && !labels.includes(item.fieldLabel)) {
      labels.push(item.fieldLabel)
    }
  }
  if (labels.length <= MAX_LABELS) return labels.join(' · ')
  const rest = labels.length - MAX_LABELS
  return `${labels.slice(0, MAX_LABELS).join(' · ')} · +${rest}`
})

const currentReason = computed(() => {
  const stop = currentStop.value
  if (!stop) return ''
  const key = stopKeys(stop)[0]
  return (key !== undefined ? reasons[key] : '') ?? ''
})

/**
 * The single entry point for changing a decision.
 *
 * Every write goes through here so a group can never end up half-accepted: the
 * new value is decided once for the whole stop rather than per member, which
 * also heals a group that somehow went out of step.
 */
function setStopSelected(stop: ApprovalStop, value: boolean) {
  for (const key of stopKeys(stop)) {
    selected[key] = value
  }
  // Preview first, then measure. The DOM strategy writes synchronously so the
  // measurement below sees it; the props strategy re-renders asynchronously, so
  // it needs the extra pass.
  overrides.apply(stopItemIds(stop))
  highlight.value?.updateRects()
  nextTick(() => highlight.value?.updateRects())
}

function toggleStop(stop: ApprovalStop) {
  setStopSelected(stop, !isStopSelected(stop))
}

function onToggleStopKey(key: string) {
  const stop = stops.value.find((s) => s.key === key)
  if (stop) toggleStop(stop)
}

function onToolbarSelected(value: boolean) {
  const stop = currentStop.value
  if (stop) setStopSelected(stop, value)
}

function onToolbarReason(value: string) {
  const stop = currentStop.value
  if (!stop) return
  // One reason for one decision: it applies to every change behind the stop.
  for (const key of stopKeys(stop)) {
    reasons[key] = value
  }
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

/**
 * Whether a stop can be manually edited. Editing rewrites one field's whole
 * value, so a stop covering several fields has no single subject — and the
 * overlay needs an element to anchor to, or the action would silently do
 * nothing.
 */
function canEditStop(stop: ApprovalStop): boolean {
  if (!props.editable) return false
  const itemIds = stopItemIds(stop)
  if (itemIds.length !== 1) return false
  const itemId = itemIds[0]!
  const item = effectiveItems.value.find((i) => i.id === itemId)
  if (!item) return false
  if (!overrides.anchorElement(itemId)) return false
  return !!editConfigForItem(item)
}

const canEditCurrent = computed(() => {
  const stop = currentStop.value
  return !!stop && canEditStop(stop)
})

/** Per-stop editability for the Highlight pills. */
const editableStopKeys = computed<Record<string, boolean>>(() => {
  if (!props.editable) return {}
  return Object.fromEntries(
    stops.value.map((stop) => [stop.key, canEditStop(stop)]),
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
  const stop = currentStop.value
  if (!stop || !canEditStop(stop)) return
  const itemId = stopItemIds(stop)[0]!
  const item = effectiveItems.value.find((i) => i.id === itemId)
  if (!item) return
  const config = editConfigForItem(item)
  const host = resolveHost(item.uuid)
  // Fields without their own element anchor the overlay to whatever their
  // highlight uses — the block, or the provider root. The element is purely an
  // anchor here: the overlay is seeded from `value` and the live preview goes
  // through the props-based override.
  const element = overrides.anchorElement(itemId)
  if (!config || !host || !element) return
  // Seed with the value as currently decided: accepted chunks show the
  // proposed text, rejected chunks the original text.
  const seed = item.segments
    ? reassembleValue(item.segments, acceptedByIdFor(item))
    : item.value
  // Restore the field's original DOM synchronously BEFORE the overlay mounts,
  // so the overlay's own override captures a clean field.
  overrides.beginEdit(itemId)
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
  // Seed the whole-field unit's decision state: for previously segmented items
  // the key doesn't exist yet and would read as unselected. A manual revision
  // supersedes whatever chunk decisions preceded it.
  //
  // This cannot desync a merged stop: only stops covering exactly one item are
  // editable (see `canEditStop`), so there are no siblings to leave behind.
  selected[String(item.id)] = true
  if (reasons[String(item.id)] === undefined) {
    reasons[String(item.id)] = ''
  }
}

async function onEditClose() {
  const current = editing.value
  if (!current) return
  editing.value = null
  // Wait for the (possibly collapsed) item to propagate to the stop list
  // before re-rendering the diff preview from it.
  await nextTick()
  overrides.endEdit(current.item.id)
  const idx = stopIndexForItem(current.item.id)
  if (idx !== -1) {
    currentIndex.value = idx
  }
  highlight.value?.updateRects()
}

function onApply() {
  // Reset accepted items' editables to their original Vue-tracked DOM BEFORE
  // notifying the consumer (see useApprovalOverrides for the rationale).
  overrides.commitAll()
  emit('apply', {
    selected: { ...selected },
    reasons: { ...reasons },
    edited: Object.fromEntries(
      Object.entries(editedValues).map(([id, value]) => [id, value]),
    ),
    // Items the user decided in one go, so the tools can report them as a
    // field-level decision instead of inventing a per-chunk verdict.
    atomicItemIds: stops.value
      .filter((stop) => stop.kind === 'group')
      .flatMap((stop) => stopItemIds(stop)),
  })
}

function scrollToStop(stop: ApprovalStop) {
  const unit = stop.units[0]
  if (!unit) return
  const host = resolveHost(unit.item.uuid)
  if (host) {
    const fieldEl = directive.findEditableElement(unit.item.fieldName, host)
    if (fieldEl) {
      // For chunk stops, scroll the specific chunk element into view via the
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
  const total = stops.value.length
  if (total === 0) return
  currentIndex.value = (currentIndex.value - 1 + total) % total
  const stop = stops.value[currentIndex.value]
  if (stop) scrollToStop(stop)
}

function next() {
  const total = stops.value.length
  if (total === 0) return
  currentIndex.value = (currentIndex.value + 1) % total
  const stop = stops.value[currentIndex.value]
  if (stop) scrollToStop(stop)
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
    const stop = currentStop.value
    if (stop) {
      toggleStop(stop)
    }
  }
})

onBlokkliEvent('editable:focus', (e) => {
  if (editing.value) return
  // The event omits the uuid for host-entity fields, so fill it in or clicking
  // the page's own title during approval would never match anything.
  const uuid = e.uuid ?? context.value.entityUuid
  // Jump to the first stop belonging to the focused field — for unsegmented
  // items that's the field itself, for segmented items it's the first changed
  // segment, which is the most useful entry point.
  const idx = stops.value.findIndex((stop) =>
    stop.units.some(
      (unit) => unit.item.fieldName === e.fieldName && unit.item.uuid === uuid,
    ),
  )
  if (idx !== -1) {
    currentIndex.value = idx
  }
})

onMounted(async () => {
  ui.setIsApproving(true)
  // Previews are applied here rather than during setup so the overrides capture
  // the fields exactly as the consumer left them.
  overrides.applyAll()
  await nextTick()
  highlight.value?.updateRects()
  const first = stops.value[0]
  if (first) {
    scrollToStop(first)
  }
})

onBeforeUnmount(() => {
  ui.setIsApproving(false)
  // Undo every live preview, re-inserting the original Vue-managed nodes. This
  // used to happen per highlight rectangle; now that one rectangle can stand
  // for several fields, the overrides outlive them and must be cleaned up here.
  overrides.restoreAll()
})
</script>
