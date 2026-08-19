import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { PageState } from '#blokkli/agent/shared/types'

/**
 * Snapshot the volatile editor state in the wire shape.
 *
 * Every prompt-sending path must attach this to its `start` message — the
 * server treats it as "the editor state when this message was sent", merges it
 * into the session's page context, and diffs it against what the LLM was last
 * told to announce changes (taking ownership, switching language, publishing).
 *
 * Always call at send time so the snapshot is live. Unlike `selectedBlocks`
 * (which a retry replays as originally sent), page state describes NOW —
 * replaying an old snapshot would silently revert the agent's world view.
 *
 * The fields mirror what `buildPageContext` reads for the same properties so
 * the init-time context and the per-message state can't drift apart.
 */
export function snapshotPageState(app: BlokkliApp): PageState {
  return {
    editMode: app.state.editMode.value,
    entityLanguage: app.context.value.language,
    isPublished: app.state.entity.value.status ?? null,
    title: app.state.entity.value.label || '',
  }
}
