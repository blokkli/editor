import type { AgentToolMap, AgentToolName } from '#blokkli-build/agent-client'

/**
 * Imperative test API exposed on `window.__BLOKKLI__.test` by the playground
 * `test-cases` feature.
 *
 * Each method drives one test scenario and resolves when it finishes, so E2E
 * tests can trigger the exact same flow as the sidebar buttons without relying
 * on sidebar open/click choreography. Playground-only, so it never ships in the
 * editor package.
 */
export interface BlokkliTestApi {
  /**
   * Run the diff-approval restore scenario: shows a DiffApproval preview for the
   * host entity's `title` and `lead` plus one random card-block `title`.
   *
   * Resolves with `{ applied }` once the preview is applied or cancelled (from
   * the toolbar or programmatically). Applying does not mutate anything — this
   * is a pure preview/cleanup scenario that exercises DOM restoration.
   *
   * Pass `{ reverseOrder: true }` to send the items in reverse visual order, so
   * `props.items` order differs from the sorted display order — used by the
   * keyboard-sync regression test.
   */
  runDiffApproval: (opts?: {
    reverseOrder?: boolean
  }) => Promise<{ applied: boolean }>

  /**
   * Show a single-field diff whose apply performs a REAL mutation (persists
   * `value` via the adapter, creating an undoable history entry). Resolves with
   * `{ applied }` once applied or cancelled. Omit `uuid` for a host-entity field.
   */
  applyFieldDiff: (target: {
    fieldName: string
    uuid?: string
    value: string
  }) => Promise<{ applied: boolean }>

  /**
   * Seed the target field with `before`, then show a DiffApproval whose
   * segments are derived from `before → after`. Applying persists the
   * reassembled hybrid (accepted chunks + original chunks for rejected ones).
   * Omit `uuid` for a host-entity field. Used by the chunk-level e2e test.
   */
  applyChunkFieldDiff: (target: {
    fieldName: string
    uuid?: string
    before: string
    after: string
  }) => Promise<{ applied: boolean }>

  /**
   * Invoke an agent client tool directly (no LLM, no WebSocket) and return its
   * result — exactly what the LLM would see in the tool_result `content`,
   * unwrapped from the query envelope. Use for assertions about a tool's
   * return value (what content it exposes), not about how the agent frames it.
   */
  runAgentTool: <T extends AgentToolName>(
    name: T,
    params: AgentToolMap[T]['params'],
  ) => Promise<AgentToolMap[T]['result']>

  /**
   * Invoke a component tool (one that renders its own approval UI, e.g.
   * `update_text_fields`): validates and prepares params via the tool's
   * `execute`, mounts the tool's component, and resolves with the raw
   * `ComponentToolResult` emitted on `done` — including `agentMessage` and
   * `_`-prefixed meta. The promise stays pending while the approval UI is
   * open, so specs can drive it (accept/reject/edit) before awaiting.
   */
  runComponentTool: (
    name: AgentToolName,
    params: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>
}
