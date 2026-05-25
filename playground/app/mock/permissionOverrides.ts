/**
 * E2E permission overrides.
 *
 * When the editor is opened with `?testing=true`, the mock adapter applies any
 * permission overrides stored here, letting an E2E spec grant or deny
 * permissions per block bundle (or replace the user-level permissions) without
 * hardcoding test-specific logic in the adapter. This is the generic,
 * reusable counterpart to the `RESTRICT_PERMISSIONS` dev flag in `allTypes.ts`.
 *
 * The override lives in `localStorage` and must be written BEFORE the editor
 * boots, because the permissions provider reads `getAllBundles()` /
 * `getUserPermissions()` exactly once at init. The E2E harness seeds it via
 * `openEditor(path, { permissions })`, which writes this key in a
 * `page.addInitScript` before navigation.
 *
 * This module is plain TS (no Nuxt imports) so the E2E support helpers can share
 * the storage key and types with it (mirrors `testRecorder.ts`).
 */
export const PERMISSION_OVERRIDES_KEY = 'blokkli:test:permissionOverrides'

export interface PermissionOverrides {
  /**
   * Replace a bundle's block permissions, keyed by bundle id. The value is the
   * full permission list for that bundle (`'add' | 'delete' | 'edit'`), so
   * `{ text: ['add', 'edit'] }` denies deleting `text` blocks.
   */
  blockPermissions?: Record<string, string[]>

  /**
   * Replace the full set of user-level permissions (e.g. to test features gated
   * by `requiredPermissions`).
   */
  userPermissions?: string[]
}

/** Read the current permission overrides. Safe to call in any environment. */
export function readPermissionOverrides(): PermissionOverrides {
  try {
    return JSON.parse(localStorage.getItem(PERMISSION_OVERRIDES_KEY) || '{}')
  } catch {
    return {}
  }
}
