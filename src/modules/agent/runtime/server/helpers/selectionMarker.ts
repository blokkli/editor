import type { SelectedBlock } from '../../shared/types'

/**
 * Build the marker prepended to a user message, describing what the user had
 * selected in the editor at the moment they sent it.
 *
 * Returns null when nothing was selected — and that null is meaningful: the
 * client attaches the selection to every message the user writes, so a
 * user-written message without a marker tells the LLM the selection was empty.
 * Tool relays and synthesised `[System: ...]` turns are not user-written and
 * never pass through here.
 *
 * The wording is deliberately time-scoped ("when this message was sent") so an
 * older marker further up the history doesn't read as the current selection.
 */
export function formatSelectionMarker(blocks?: SelectedBlock[]): string | null {
  if (!blocks?.length) {
    return null
  }

  const formatted = blocks.map((b) => `${b.bundle} (${b.uuid})`).join(', ')
  return `[Editor selection when this message was sent: ${formatted}]`
}
