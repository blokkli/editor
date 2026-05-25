/**
 * E2E test recorder.
 *
 * When the editor is opened with `?testing=true`, the mock adapter records the
 * arguments of selected mutation calls here so E2E specs can assert that a UI
 * flow invoked the right adapter method with the right payload (e.g. that the
 * publish dialog's "save" vs "publish" vs "schedule" modes map to the correct
 * call).
 *
 * Records go to `localStorage`, NOT a `window` property, on purpose: a
 * successful publish reloads the page (`window.location.href = route.path`),
 * which would wipe a window object before the test could read it. `localStorage`
 * survives the reload (same origin), so the record is still there afterwards.
 *
 * This module is plain TS (no Nuxt imports) so the E2E support helpers can share
 * the storage key and types with it.
 */
export const ADAPTER_CALLS_KEY = 'blokkli:test:adapterCalls'

export interface RecordedAdapterCall {
  method: string
  args: unknown
}

/** Append an adapter call to the record. Safe to call in any environment. */
export function recordAdapterCall(method: string, args: unknown): void {
  try {
    const existing: RecordedAdapterCall[] = JSON.parse(
      localStorage.getItem(ADAPTER_CALLS_KEY) || '[]',
    )
    existing.push({ method, args })
    localStorage.setItem(ADAPTER_CALLS_KEY, JSON.stringify(existing))
  } catch {
    // Ignore — recording is best-effort test instrumentation.
  }
}
