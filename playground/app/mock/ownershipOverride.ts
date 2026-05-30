/**
 * E2E ownership override.
 *
 * Lets a spec start the editor in a state where the current user is NOT the
 * owner of the page (and optionally pick the displayed owner's name/id), so
 * the OwnershipBanner renders and the "Assign to me" flow can be exercised.
 *
 * The mock's default is `isOwner = true` (banner never renders) — without
 * this seam, the only way to reach the not-owner state would be to mutate the
 * mock's internal flag from another browser context, which we can't do in a
 * single Playwright session.
 *
 * Override shape:
 *   - `currentUserIsOwner`: replaces the initial `isOwner` flag (default true).
 *   - `ownerName` / `ownerId`: replace the displayed owner's name/id returned
 *     by `mapState`. Defaults fall through to `state.owner.{name,id}`.
 *
 * Plain TS (no Nuxt imports) so the E2E support helpers can share the storage
 * key and types with it (mirrors `permissionOverrides.ts`,
 * `outdatedTranslationsOverride.ts`, and `testRecorder.ts`).
 */
export const OWNERSHIP_OVERRIDE_KEY = 'blokkli:test:ownership'

export interface OwnershipOverride {
  currentUserIsOwner?: boolean
  ownerName?: string
  ownerId?: string
}

/** Read the seeded override, or null if none. Safe to call in any environment. */
export function readOwnershipOverride(): OwnershipOverride | null {
  try {
    const raw = localStorage.getItem(OWNERSHIP_OVERRIDE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
