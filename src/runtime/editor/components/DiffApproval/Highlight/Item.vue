<template>
  <div
    v-for="unit in units"
    v-show="!isEditing"
    :key="unit.key"
    class="absolute top-0 left-0 rounded"
    :class="[
      selected[unit.key]
        ? 'border-lime-normal outline-lime-normal/30'
        : 'border-red-normal outline-red-normal/30',
      activeKey === unit.key
        ? 'border-4 outline-[5px] rounded-tl-none'
        : 'border hover:border-mono-500 hover:bg-mono-400/20',
    ]"
    :style="rects[unit.key]"
    data-test="diff-approval-highlight-item"
    :data-test-active="activeKey === unit.key"
    :data-test-selected="!!selected[unit.key]"
    :data-test-kind="unit.kind"
    :data-test-fallback="usesFallbackElement"
    :data-test-segment-id="unit.kind === 'segment' ? unit.segment.id : null"
  >
    <button
      class="size-full block"
      @click.prevent="emit('activate', unit.key)"
    />
    <div
      v-show="activeKey === unit.key"
      class="absolute left-[-3px] bottom-full flex gap-3"
    >
      <button
        class="h-30 px-8 flex items-center justify-center gap-5 text-white rounded-t-md"
        :class="
          selected[unit.key]
            ? 'bg-lime-normal hover:bg-lime-dark'
            : 'bg-red-normal hover:bg-red-dark'
        "
        @click.prevent="emit('toggle', unit.key)"
      >
        <Icon
          :name="selected[unit.key] ? 'bk_mdi_check' : 'bk_mdi_close'"
          class="size-20 p-2 rounded flex items-center justify-center border border-white"
          :class="
            selected[unit.key] ? 'text-lime-normal bg-white' : 'text-white'
          "
        />
        <span
          class="text-xs font-semibold uppercase tracking-wider leading-none translate-y-1"
        >
          {{
            selected[unit.key]
              ? $t('aiAgentApprovalAccepted', 'Accepted')
              : $t('aiAgentApprovalRejected', 'Rejected')
          }}
        </span>
      </button>
      <button
        v-if="canEdit"
        class="h-30 px-8 flex items-center justify-center gap-5 text-white rounded-t-md bg-mono-800 hover:bg-mono-700"
        data-test="diff-approval-highlight-edit"
        @click.prevent="emit('edit')"
      >
        <Icon name="bk_mdi_edit" class="size-20 p-2" />
        <span
          class="text-xs font-semibold uppercase tracking-wider leading-none translate-y-1"
        >
          {{ $t('aiAgentApprovalEdit', 'Edit') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, ref, computed, onBeforeUnmount, useBlokkli } from '#imports'
import {
  useEditableFieldOverride,
  onBlokkliEvent,
} from '#blokkli/editor/composables'
import { Icon } from '#blokkli/editor/components'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import {
  computeDiff,
  computeInsertion,
  flattenSegments,
  reassembleValue,
  renderSegmentDiff,
} from '#blokkli/editor/helpers/diff'
import type { ApprovalItem, ApprovalUnit } from '../types'

type ItemRect = {
  width: string
  height: string
  transform: string
  visibility?: 'hidden' | 'visible'
}

const props = defineProps<{
  item: ApprovalItem
  /** Units belonging to this item, in reading order. Never empty in practice. */
  units: ApprovalUnit[]
  selected: Record<string, boolean>
  activeKey: string | null
  /**
   * Render the new value entirely as an insertion instead of a diff. See the
   * prop of the same name on DiffApproval.
   */
  insertionsOnly?: boolean

  /**
   * Whether this item's field supports manual editing — shows an Edit button
   * next to the active unit's toggle pill. Editing always operates on the
   * whole field, even when triggered from a segment unit.
   */
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'activate' | 'toggle', key: string): void
  (e: 'edit'): void
}>()

const { $t, ui, blocks, context } = useBlokkli()

function resolveHost(): EntityContext {
  if (props.item.uuid === context.value.entityUuid) {
    return {
      type: context.value.entityType,
      bundle: context.value.entityBundle,
      uuid: props.item.uuid,
    }
  }
  const block = blocks.getBlock(props.item.uuid)
  return {
    type: itemEntityType,
    bundle: block?.bundle || '',
    uuid: props.item.uuid,
  }
}

const host = resolveHost()
const override = useEditableFieldOverride(props.item.fieldName, host)

const isSegmented = computed(() => Array.isArray(props.item.segments))

/** Per-segment acceptance map keyed by segment id, derived from `selected`. */
const acceptedBySegmentId = computed<Record<string, boolean>>(() => {
  if (!props.item.segments) return {}
  const out: Record<string, boolean> = {}
  for (const atom of flattenSegments(props.item.segments)) {
    out[atom.id] = props.selected[`${props.item.id}:${atom.id}`] !== false
  }
  return out
})

const diffHtml = computed(() => {
  if (props.item.segments) {
    return renderSegmentDiff(props.item.segments, {
      insertionsOnly: props.insertionsOnly,
      acceptedById: acceptedBySegmentId.value,
    })
  }
  return props.insertionsOnly
    ? computeInsertion(props.item.value)
    : computeDiff(override.originalValue, props.item.value)
})

/**
 * Apply or remove the preview overlay.
 *
 * - Unsegmented items: selected → diff, rejected → original (whole-field swap).
 * - Segmented items: always set the diff HTML; `renderSegmentDiff` is fed the
 *   per-segment acceptance map, so rejected chunks render their original
 *   content with no markers. Re-running on every selection change keeps the
 *   preview in sync with what would actually land on apply.
 * - Props-based overrides (no element): diff markup can't render, so the
 *   preview is the real value that would land on apply — the proposed value
 *   (or reassembled hybrid) when accepted, the original when rejected.
 */
function applyOverride() {
  if (!override.element) {
    if (props.item.segments) {
      override.setValue(
        reassembleValue(props.item.segments, acceptedBySegmentId.value),
      )
      return
    }
    const onlyUnit = props.units[0]
    if (onlyUnit && props.selected[onlyUnit.key]) {
      override.setValue(props.item.value)
    } else {
      override.restore()
    }
    return
  }
  if (isSegmented.value) {
    override.setDiffHtml(diffHtml.value)
    return
  }
  const onlyUnit = props.units[0]
  if (onlyUnit && props.selected[onlyUnit.key]) {
    override.setDiffHtml(diffHtml.value)
  } else {
    override.restore()
  }
}

applyOverride()

// Reapply on every selection change. For segmented items the rendered markup
// changes (rejected chunks revert visually); for unsegmented items the diff
// is replaced by the original. Either way the rectangle bounds may shift.
watch(
  () => props.units.map((u) => props.selected[u.key]),
  () => {
    if (isEditing.value) return
    applyOverride()
    updateRects()
  },
)

let committed = false

function commitForApply() {
  override.restore()
  committed = true
}

/**
 * While the field is being manually edited in the editable-field overlay, this
 * item's override must be inert: the diff markup is removed so the overlay
 * captures (and live-previews over) the clean, Vue-tracked original DOM.
 */
const isEditing = ref(false)

function beginEdit() {
  isEditing.value = true
  override.restore()
}

function endEdit() {
  isEditing.value = false
  applyOverride()
  updateRects()
}

onBeforeUnmount(() => {
  if (committed) return
  override.restore()
})

defineExpose({
  itemId: props.item.id,
  updateRects,
  commitForApply,
  beginEdit,
  endEdit,
})

const rects = ref<Record<string, ItemRect>>({})

const HIDDEN_RECT: ItemRect = {
  width: '0',
  height: '0',
  transform: '',
  visibility: 'hidden',
}

function computeRect(el: HTMLElement): ItemRect {
  const r = ui.getAbsoluteElementRect(el)
  const pad = 5
  return {
    width: r.width + pad * 2 + 'px',
    height: r.height + pad * 2 + 'px',
    transform: `translate(${r.x - pad}px, ${r.y - pad}px)`,
  }
}

/**
 * Whether the highlight anchors to the block's root element instead of the
 * field element. Happens when the field is approvable but not rendered with
 * the editable directive (e.g. a translatable text field displayed as plain
 * markup) — without the fallback the unit would be counted in the toolbar but
 * invisible in the canvas.
 */
const usesFallbackElement = !override.element

function resolveFallbackElement(): HTMLElement | null {
  if (host.type !== itemEntityType) return null
  return document.querySelector<HTMLElement>(
    `[data-bk-uuid="${CSS.escape(props.item.uuid)}"]`,
  )
}

function resolveUnitElement(unit: ApprovalUnit): HTMLElement | null {
  const root = override.element
  if (!root) return resolveFallbackElement()
  if (unit.kind === 'whole') return root
  return root.querySelector<HTMLElement>(
    `[data-chunk-index="${CSS.escape(unit.segment.id)}"]`,
  )
}

function updateRects() {
  const next: Record<string, ItemRect> = {}
  for (const unit of props.units) {
    const el = resolveUnitElement(unit)
    next[unit.key] = el ? computeRect(el) : HIDDEN_RECT
  }
  rects.value = next
}

updateRects()

let lastFullUpdate = 0

onBlokkliEvent('animationFrame', (ctx) => {
  if (isEditing.value) return
  // Refresh whole-field items every 1s to track viewport changes. Per-segment
  // items skip the periodic refresh — querying N chunk rects per second per
  // item adds up fast and the rects almost never drift on their own; they
  // get recomputed on every toggle anyway.
  const forceRefresh = ctx.time - lastFullUpdate > 1000
  if (!forceRefresh) return
  lastFullUpdate = ctx.time
  if (!isSegmented.value) {
    updateRects()
  }
})
</script>
