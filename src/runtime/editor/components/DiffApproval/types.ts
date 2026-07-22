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
