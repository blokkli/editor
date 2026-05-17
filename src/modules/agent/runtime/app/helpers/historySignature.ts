import type { MutationItem } from '#blokkli/editor/types/state'

/**
 * A snapshot identifier for the mutation at a given history index. Used to
 * detect whether a previously snapshotted rollback target is still reachable —
 * the index alone is not enough because manual undo + new edits can replace
 * mutations in place while keeping the array length similar.
 */
export function computeHistorySignature(
  mutations: MutationItem[],
  index: number,
): string {
  if (index < 0) return 'pristine'
  const m = mutations[index]
  if (!m) return 'unknown'
  return `${m.timestamp ?? ''}|${m.pluginId ?? ''}|${m.plugin?.label ?? ''}`
}

/**
 * Returns true when `index` still exists in `mutations` AND the mutation at
 * that position still matches the recorded `signature`. Used to decide
 * whether to show retry/edit on a user message.
 */
export function isHistorySnapshotReachable(
  mutations: MutationItem[],
  index: number | undefined,
  signature: string | undefined,
): boolean {
  if (index === undefined || signature === undefined) return false
  if (index < -1) return false
  if (index === -1) return signature === 'pristine'
  if (index >= mutations.length) return false
  return computeHistorySignature(mutations, index) === signature
}
