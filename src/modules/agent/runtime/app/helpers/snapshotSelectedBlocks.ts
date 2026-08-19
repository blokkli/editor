import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { SelectedBlock } from '#blokkli/agent/shared/types'

/**
 * Snapshot the live editor selection in the wire shape.
 *
 * Every path that sends a prompt must call this, because the LLM reads the
 * ABSENCE of a selection marker as "nothing was selected when the user wrote
 * this". A prompt that skips the snapshot doesn't merely omit context — it
 * asserts an empty selection. See the selection rules in the
 * `important-rules` system prompt.
 *
 * Returns an empty array when nothing is selected; the wire boundary
 * (`agentProvider.sendPrompt`) turns that into an omitted field.
 */
export function snapshotSelectedBlocks(app: BlokkliApp): SelectedBlock[] {
  return app.selection.items.value.map((item) => ({
    uuid: item.uuid,
    bundle: item.bundle,
    label: app.types.getBlockLabel(item.bundle),
  }))
}
