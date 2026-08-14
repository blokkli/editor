import type { AtomicSegment, Segment } from '#blokkli/editor/helpers/diff'
import { flattenSegments } from '#blokkli/editor/helpers/diff'

export type ApprovalItem = {
  id: number
  uuid: string
  fieldName: string
  fieldLabel: string
  /**
   * The fully-accepted value for the field. When `segments` is present this is
   * still the canonical "all accepted" value (`reassembleValue(segments, {})`),
   * kept for tools that don't care about chunk-level acceptance.
   */
  value: string
  /**
   * Two-level segmentation of the rewrite: top-level blocks plus one-level
   * recursion into <ul>/<ol> for per-<li> toggles. When absent the field is
   * treated as a single all-or-nothing unit.
   */
  segments?: Segment[]
}

/**
 * One thing the user can accept or reject from the keyboard or a click.
 * For unsegmented items there's one whole-field unit; for segmented items
 * there's one unit per atomic, *changed* segment.
 */
export type ApprovalUnit =
  | {
      kind: 'whole'
      key: string
      item: ApprovalItem
    }
  | {
      kind: 'segment'
      key: string
      item: ApprovalItem
      segment: AtomicSegment
    }

/** Payload emitted by DiffApproval's `apply` event. */
export type DiffApplyPayload = {
  /**
   * Acceptance keyed by unit. For unsegmented items the key is the
   * stringified item id; for segmented items it's `${itemId}:${segmentId}`.
   */
  selected: Record<string, boolean>
  reasons: Record<string, string>
  /**
   * Values the user manually revised before applying, keyed by stringified
   * item id. An edited item always resolves as a single whole-field unit,
   * regardless of any segments it originally had.
   */
  edited: Record<string, string>
  /**
   * Items the user decided as a whole rather than chunk by chunk, because their
   * changes were merged into one approvable stop.
   *
   * Such an item may still carry `segments`, but the user never saw them as
   * separate choices — so reporting a per-chunk verdict for it would invent
   * feedback that was never given.
   */
  atomicItemIds: number[]
}

/**
 * One thing the user navigates to and toggles: a *presentation* grouping over
 * units.
 *
 * A field whose value is only reachable through `propsFieldMapping` has no
 * element of its own, so its highlight can only be drawn on an enclosing
 * element — the block, or the provider root. Several such fields would then draw
 * identical, stacked rectangles that swallow each other's clicks (and any
 * nested field's). Merging them into one stop makes the review usable: one
 * rectangle, one decision, applied to every change behind it.
 *
 * Stops exist purely for navigation and hit-testing. `selected`/`reasons` stay
 * keyed by `ApprovalUnit.key`, so `decideFieldUpdates` and the apply payload are
 * unaffected — a stop's toggle fans out to its members.
 */
export type ApprovalStop = {
  /** The unit's key when ungrouped, `group:${groupKey}` when merged. */
  key: string
  kind: 'whole' | 'segment' | 'group'
  /** Representative uuid — the first member's. Groups never span uuids. */
  uuid: string
  /** Members in reading order. Never empty. */
  units: ApprovalUnit[]
}

/**
 * Expand items into their toggle units. Unchanged segments inside a list are
 * skipped — they're context, not choices.
 */
export function unitsFromItems(items: ApprovalItem[]): ApprovalUnit[] {
  const units: ApprovalUnit[] = []
  for (const item of items) {
    if (item.segments) {
      const atoms = flattenSegments(item.segments).filter((s) => s.changed)
      for (const segment of atoms) {
        units.push({
          kind: 'segment',
          key: `${item.id}:${segment.id}`,
          item,
          segment,
        })
      }
    } else {
      units.push({ kind: 'whole', key: String(item.id), item })
    }
  }
  return units
}

/**
 * Collapse units into navigation stops.
 *
 * `groupKeyByItemId` maps an item id to the identity of the element its
 * highlight would be drawn on, but *only* when that element is a fallback (an
 * enclosing block or the provider root) rather than the field's own. `null` or
 * absent means the item has its own element and keeps one stop per unit.
 *
 * Keying on the resolved element rather than the uuid is deliberate: a
 * host-entity field and a block field whose block element cannot be found both
 * fall back to the provider root, and grouping those by uuid would produce two
 * identical stacked rectangles — the very bug stops exist to fix.
 *
 * Pure and DOM-free so it can be unit-tested; the caller does the resolving.
 */
export function stopsFromUnits(
  units: ApprovalUnit[],
  groupKeyByItemId: Map<number, string | null>,
): ApprovalStop[] {
  const stops: ApprovalStop[] = []
  // Group key → the stop already created for it, so later members join the
  // stop in place rather than appending a second one. A group therefore sits at
  // the position of its first member unit.
  const groups = new Map<string, ApprovalStop>()

  for (const unit of units) {
    const groupKey = groupKeyByItemId.get(unit.item.id) ?? null

    if (groupKey === null) {
      stops.push({
        key: unit.key,
        kind: unit.kind,
        uuid: unit.item.uuid,
        units: [unit],
      })
      continue
    }

    const existing = groups.get(groupKey)
    if (existing) {
      existing.units.push(unit)
      continue
    }

    const stop: ApprovalStop = {
      key: `group:${groupKey}`,
      kind: 'group',
      uuid: unit.item.uuid,
      units: [unit],
    }
    groups.set(groupKey, stop)
    stops.push(stop)
  }

  return stops
}

/** Inline style placing a stop's rectangle on the canvas overlay. */
export type StopRect = {
  width: string
  height: string
  transform: string
  visibility?: 'hidden' | 'visible'
}

/** The `selected`/`reasons` keys a stop's decision applies to. */
export function stopKeys(stop: ApprovalStop): string[] {
  return stop.units.map((unit) => unit.key)
}

/** The distinct item ids a stop covers, in reading order. */
export function stopItemIds(stop: ApprovalStop): number[] {
  const ids: number[] = []
  for (const unit of stop.units) {
    if (!ids.includes(unit.item.id)) {
      ids.push(unit.item.id)
    }
  }
  return ids
}
