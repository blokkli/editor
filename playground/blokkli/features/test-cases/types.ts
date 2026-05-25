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
   */
  runDiffApproval: () => Promise<{ applied: boolean }>

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
}
