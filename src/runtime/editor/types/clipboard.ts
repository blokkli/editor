/**
 * Map of all clipboard payload types features can paste.
 *
 * Each value must include a `type` literal discriminator matching its
 * key. Features augment this interface to register their own payloads:
 *
 *   declare module '#blokkli/editor/types/clipboard' {
 *     interface BlokkliClipboardTypes {
 *       my_thing: { type: 'my_thing'; ...payload }
 *     }
 *   }
 *
 * On the wire, payloads are wrapped in a marker envelope (see
 * `BlokkliClipboardEnvelope`) so paste detection never confuses
 * arbitrary user-pasted JSON with a blökkli payload.
 */
// oxlint-disable-next-line typescript-eslint/no-empty-object-type
export interface BlokkliClipboardTypes {}

export type BlokkliClipboardPayload =
  BlokkliClipboardTypes[keyof BlokkliClipboardTypes]

/**
 * Metadata captured at copy time about the host entity the payload was
 * produced from. Lets listeners reason about whether a payload makes
 * sense in the current paste context — e.g. the `selection` listener
 * skips when the source host differs, because the copied block UUIDs
 * don't exist on a different host.
 */
export type BlokkliClipboardMeta = {
  hostUuid: string
  hostEntityType: string
  hostBundle: string
}

export const CLIPBOARD_ENVELOPE_FLAG = 'blokkli_clipboard_data'

export type BlokkliClipboardEnvelope = {
  [CLIPBOARD_ENVELOPE_FLAG]: true
  meta: BlokkliClipboardMeta
  data: BlokkliClipboardPayload
}

/**
 * Runtime shape of a paste event: the unwrapped envelope minus the
 * marker flag. This is what `'clipboard:paste'` listeners receive.
 */
export type BlokkliClipboardPasteEvent = {
  meta: BlokkliClipboardMeta
  data: BlokkliClipboardPayload
}

/**
 * Validate a parsed JSON value as a clipboard envelope and unwrap it.
 * Returns null when the value is not a blökkli envelope.
 *
 * Listener features are expected to do their own per-`type` shape
 * validation on `data` after unwrapping.
 */
export function parseClipboardEnvelope(
  raw: unknown,
): BlokkliClipboardPasteEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (obj[CLIPBOARD_ENVELOPE_FLAG] !== true) return null

  const meta = obj.meta
  if (!meta || typeof meta !== 'object') return null
  const m = meta as Record<string, unknown>
  if (
    typeof m.hostUuid !== 'string' ||
    typeof m.hostEntityType !== 'string' ||
    typeof m.hostBundle !== 'string'
  ) {
    return null
  }

  const data = obj.data
  if (!data || typeof data !== 'object') return null
  if (typeof (data as { type?: unknown }).type !== 'string') return null

  return {
    meta: {
      hostUuid: m.hostUuid,
      hostEntityType: m.hostEntityType,
      hostBundle: m.hostBundle,
    },
    data: data as BlokkliClipboardPayload,
  }
}
