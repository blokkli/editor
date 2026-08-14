import { useBlokkli } from '#imports'
import { useEditableFieldOverride } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'
import type { EntityContext } from '#blokkli/types'
import type { EditableFieldOverride } from '#blokkli/editor/composables/useEditableFieldOverride'
import {
  computeDiff,
  computeInsertion,
  flattenSegments,
  reassembleValue,
  renderSegmentDiff,
} from '#blokkli/editor/helpers/diff'
import type { ApprovalItem } from './types'

export type ApprovalOverrides = {
  /**
   * The identity of the element this item's highlight is drawn on, but only
   * when that element is a *fallback* (an enclosing block, or the provider
   * root). Returns `null` when the field has its own element, i.e. the item
   * gets its own stop. Feed straight into `stopsFromUnits`.
   */
  anchorGroupKey(itemId: number): string | null
  /** The element this item's highlight is drawn on, whatever its level. */
  anchorElement(itemId: number): HTMLElement | null
  /** Apply the live preview for these items, honouring the current decisions. */
  apply(itemIds: Iterable<number>): void
  /** Apply the live preview for every item. */
  applyAll(): void
  /**
   * Reset every field to its original DOM before the consumer mutates, and mark
   * the overrides committed so the unmount restore becomes a no-op.
   */
  commitAll(): void
  /** Make an item's override inert so a manual edit starts on a clean field. */
  beginEdit(itemId: number): void
  /** Re-apply an item's preview after a manual edit session ended. */
  endEdit(itemId: number): void
  /** Undo every live preview. Call from the owner's `onBeforeUnmount`. */
  restoreAll(): void
}

type Entry = {
  override: EditableFieldOverride
  /** Resolved once: the directive registry and these roots don't move. */
  anchorElement: HTMLElement | null
  anchorGroupKey: string | null
  isEditing: boolean
  committed: boolean
}

/**
 * Own the live-preview overrides for a whole approval batch.
 *
 * This deliberately lives above the highlight layer. Whether a field has its
 * own element decides *both* how its preview is applied and whether its
 * highlight has to merge with its siblings' — so both answers must come from
 * one object. Resolving it separately per rectangle is what let the toolbar's
 * count and the canvas rectangles disagree in the first place.
 *
 * `items` is treated as frozen: every consumer builds its item list before
 * mounting DiffApproval (the sibling `sortedItems` snapshot relies on the same
 * thing). Items appearing later simply have no override and are skipped.
 */
export function useApprovalOverrides(options: {
  /** The batch, as a stable snapshot. */
  items: ApprovalItem[]
  /**
   * The item as it currently stands — a manual edit replaces its value and
   * drops its segments, and the preview must follow that.
   */
  effectiveItem: (itemId: number) => ApprovalItem | undefined
  /** Acceptance keyed by `ApprovalUnit.key`. */
  selected: Record<string, boolean>
  /** See DiffApproval's prop of the same name. */
  insertionsOnly: () => boolean
}): ApprovalOverrides {
  const { blocks, context } = useBlokkli()

  /**
   * Strict host resolution: an unknown block yields no host at all, rather than
   * a host with an empty bundle that would silently resolve a different (or no)
   * editable field config.
   */
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

  /**
   * The element a highlight can be drawn on, most specific first:
   *
   * 1. the field's own element, via the editable directive;
   * 2. the enclosing block;
   * 3. the provider root, for host-entity fields — without it those rectangles
   *    have no element at all and are counted in the toolbar while being
   *    invisible on the canvas.
   *
   * Levels 2 and 3 are shared by every field behind them, so they also return
   * the key those fields group under.
   */
  function resolveAnchor(
    override: EditableFieldOverride,
    host: EntityContext,
  ): Pick<Entry, 'anchorElement' | 'anchorGroupKey'> {
    if (override.element) {
      return { anchorElement: override.element, anchorGroupKey: null }
    }

    if (host.type === itemEntityType) {
      const blockElement = document.querySelector<HTMLElement>(
        `[data-bk-uuid="${CSS.escape(host.uuid)}"]`,
      )
      if (blockElement) {
        return {
          anchorElement: blockElement,
          anchorGroupKey: `block:${host.uuid}`,
        }
      }
    }

    const entityUuid = context.value.entityUuid
    const providerElement = document.querySelector<HTMLElement>(
      `[data-provider-uuid="${CSS.escape(entityUuid)}"][data-blokkli-provider-active="true"]`,
    )
    if (providerElement) {
      return {
        anchorElement: providerElement,
        anchorGroupKey: `host:${entityUuid}`,
      }
    }

    // Nothing to draw on. Still grouped, so the batch collapses to one
    // (invisible) stop instead of a stack of them.
    return { anchorElement: null, anchorGroupKey: 'none' }
  }

  const entries = new Map<number, Entry>()

  for (const item of options.items) {
    const host = resolveHost(item.uuid)
    if (!host) continue
    const override = useEditableFieldOverride(item.fieldName, host)
    entries.set(item.id, {
      override,
      ...resolveAnchor(override, host),
      isEditing: false,
      committed: false,
    })
  }

  /** Per-segment acceptance for the item, derived from `selected`. */
  function acceptedBySegmentId(item: ApprovalItem): Record<string, boolean> {
    const out: Record<string, boolean> = {}
    if (!item.segments) return out
    for (const atom of flattenSegments(item.segments)) {
      out[atom.id] = options.selected[`${item.id}:${atom.id}`] !== false
    }
    return out
  }

  /**
   * How much of the item the user currently accepts. `partial` is only
   * reachable for a field with its own element: an unanchored field's chunks all
   * belong to one stop and therefore move together.
   */
  function acceptance(item: ApprovalItem): 'all' | 'none' | 'partial' {
    if (item.segments) {
      const atoms = flattenSegments(item.segments).filter((s) => s.changed)
      if (!atoms.length) return 'none'
      const accepted = atoms.filter(
        (atom) => options.selected[`${item.id}:${atom.id}`] !== false,
      ).length
      if (accepted === atoms.length) return 'all'
      return accepted === 0 ? 'none' : 'partial'
    }
    return options.selected[String(item.id)] !== false ? 'all' : 'none'
  }

  function diffHtml(item: ApprovalItem, rawOriginalValue: string): string {
    if (item.segments) {
      return renderSegmentDiff(item.segments, {
        insertionsOnly: options.insertionsOnly(),
        acceptedById: acceptedBySegmentId(item),
      })
    }
    return options.insertionsOnly()
      ? computeInsertion(item.value)
      : // Diffed against the STORED value: `item.value` is a stored value too,
        // so using the rendered `originalValue` here would paint every bit of
        // markup the backend's filters injected as a user-visible deletion.
        computeDiff(rawOriginalValue, item.value)
  }

  /**
   * Apply or remove one item's preview.
   *
   * - With an element: the diff markup renders in place. Segmented items always
   *   re-render, because `renderSegmentDiff` shows rejected chunks as their
   *   original content, so the markup tracks the decisions.
   * - Without an element: diff markup cannot render (the component may escape
   *   the value, e.g. via `v-text`), so the preview is the real value that would
   *   land. Never the reassembled hybrid — `reassembleValue` round-trips through
   *   the DOM and is not byte-identical to `item.value`, so previewing it would
   *   show something other than what apply writes. Grouping makes these
   *   all-or-nothing, so a hybrid is unreachable here anyway.
   */
  function applyOne(itemId: number): void {
    const entry = entries.get(itemId)
    if (!entry || entry.isEditing) return
    const item = options.effectiveItem(itemId)
    if (!item) return

    const { override } = entry
    const state = acceptance(item)

    if (!override.element) {
      if (state === 'all') {
        override.setValue(item.value)
      } else if (state === 'none') {
        override.restore()
      } else if (item.segments) {
        override.setValue(
          reassembleValue(item.segments, acceptedBySegmentId(item)),
        )
      }
      return
    }

    if (item.segments) {
      override.setDiffHtml(diffHtml(item, override.rawOriginalValue))
      return
    }

    if (state === 'all') {
      override.setDiffHtml(diffHtml(item, override.rawOriginalValue))
    } else {
      override.restore()
    }
  }

  function apply(itemIds: Iterable<number>): void {
    for (const itemId of itemIds) {
      applyOne(itemId)
    }
  }

  function applyAll(): void {
    apply(entries.keys())
  }

  return {
    anchorGroupKey: (itemId) => entries.get(itemId)?.anchorGroupKey ?? null,
    anchorElement: (itemId) => entries.get(itemId)?.anchorElement ?? null,
    apply,
    applyAll,
    commitAll() {
      for (const entry of entries.values()) {
        entry.override.restore()
        entry.committed = true
      }
    },
    beginEdit(itemId) {
      const entry = entries.get(itemId)
      if (!entry) return
      entry.isEditing = true
      entry.override.restore()
    },
    endEdit(itemId) {
      const entry = entries.get(itemId)
      if (!entry) return
      entry.isEditing = false
      applyOne(itemId)
    },
    restoreAll() {
      for (const entry of entries.values()) {
        if (entry.committed) continue
        entry.override.restore()
      }
    },
  }
}
