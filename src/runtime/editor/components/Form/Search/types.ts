/**
 * One row in a `<FormSearch>` result list.
 *
 * Consumers map their domain objects to this shape. In `mode="fzf"`, the
 * component fills in `positions` from the fuzzy match. In `mode="async"`,
 * `positions` is whatever the caller supplies (may be omitted).
 */
export type FormSearchItem = {
  /** Unique identifier across the items array. */
  key: string

  /** Primary text shown on the row. Highlighted if `positions` are set. */
  label: string

  /** Group key. When grouping is enabled, items are bucketed by this value. */
  category?: string

  /** Optional smaller sub-line below the label. */
  description?: string

  /** Character indices to highlight in `label` (e.g. fzf match positions). */
  positions?: number[]
}
