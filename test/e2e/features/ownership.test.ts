import { describe, expect, test } from 'vitest'
import { openEditor, withApp, EDITOR_PATH } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import { waitForAdapterCall } from './../support/recorder'
import {
  OWNERSHIP_OVERRIDE_KEY,
  type OwnershipOverride,
} from '../../../playground/app/mock/ownershipOverride'

/**
 * Build the `openEditor({ localStorage })` entry that seeds the mock's
 * ownership state — used to put the editor into the "current user is NOT the
 * owner" branch that the OwnershipBanner reacts to. Without this, the mock
 * defaults to `isOwner = true` and the banner never mounts.
 */
function ownershipOverrideEntry(
  override: OwnershipOverride,
): Record<string, string> {
  return { [OWNERSHIP_OVERRIDE_KEY]: JSON.stringify(override) }
}

/**
 * Tests for the ownership feature (`features/ownership/index.vue`).
 *
 * Three branches, each load-bearing:
 *  1. Banner mounts iff `currentUserIsOwner === false` AND `edit` is in state
 *     permissions — read at editor init from `mapState`.
 *  2. The "Assign to me" button is rendered iff the user has the
 *     `take_ownership` permission — gated separately in the banner, not the
 *     teleport gate.
 *  3. Click → `adapter.takeOwnership()` → `currentUserIsOwner` flips true →
 *     banner unmounts (the `<Teleport>` gate's `shouldRender` is reactive).
 *
 * We assert BOTH the DOM outcome and the adapter call shape — a regression that
 * dropped one half (banner-disappears-but-no-call, or call-fires-but-banner-stuck)
 * would slip past either assertion alone.
 */
describe('Ownership', async () => {
  await setupEditorE2E()

  test('banner appears when current user is not the owner and shows the owner name', async () => {
    const page = await openEditor(EDITOR_PATH, {
      localStorage: ownershipOverrideEntry({
        currentUserIsOwner: false,
        ownerName: 'Alice Example',
      }),
    })

    const banner = page.locator('[data-test="ownership-banner"]')
    await banner.waitFor({ state: 'visible' })

    // Locale-independent assertion: the displayed owner name is exposed via
    // the data-test attribute. The visible text wraps the name in <strong>
    // and is wrapped in a translated, locale-formatted sentence — asserting
    // the visible text would tie the test to the playground's i18n.
    expect(await banner.getAttribute('data-test-owner-name')).toBe(
      'Alice Example',
    )

    // Sanity check via the editor state — guarantees the override actually
    // wired through `mapState`, not just that the banner happens to render.
    expect(
      await withApp(
        page,
        (app) => app.state.owner.value?.currentUserIsOwner ?? null,
      ),
    ).toBe(false)

    await page.close()
  })

  test('clicking "Assign to me" calls takeOwnership, flips ownership state, and dismisses the banner', async () => {
    const page = await openEditor(EDITOR_PATH, {
      localStorage: ownershipOverrideEntry({
        currentUserIsOwner: false,
        ownerName: 'Alice Example',
      }),
    })

    const banner = page.locator('[data-test="ownership-banner"]')
    await banner.waitFor({ state: 'visible' })

    // BannerInner renders exactly one <button> when the `button` prop is
    // truthy — `canTakeOwnership` is true here (default user permissions
    // include `take_ownership`).
    await banner.locator('button').click()

    // Adapter recorded the takeOwnership call. Payload is empty (the method
    // takes no args), but the recorded entry's presence is the assertion.
    await waitForAdapterCall<Record<string, never>>(page, 'take_ownership')

    // Editor's owner state flipped to "current user is owner".
    await expect
      .poll(() =>
        withApp(
          page,
          (app) => app.state.owner.value?.currentUserIsOwner ?? null,
        ),
      )
      .toBe(true)

    // Banner unmounts — `shouldRender` in features/ownership/index.vue gates
    // on `!currentUserIsOwner`, so the Teleport drops it.
    await expect.poll(() => banner.count()).toBe(0)

    await page.close()
  })

  test('banner shows but the action button is hidden when the user lacks take_ownership permission', async () => {
    // Drop `take_ownership` from the user permissions while keeping `edit`,
    // `use_blokkli`, and the state-level permission that `shouldRender` reads
    // from `state.permissions` (the latter is sourced from the edit state's
    // `permissions` field, not the user permissions — unaffected here).
    const page = await openEditor(EDITOR_PATH, {
      localStorage: ownershipOverrideEntry({
        currentUserIsOwner: false,
        ownerName: 'Bob Reader',
      }),
      permissions: {
        userPermissions: ['edit', 'use_blokkli'],
      },
    })

    const banner = page.locator('[data-test="ownership-banner"]')
    await banner.waitFor({ state: 'visible' })

    // With `canTakeOwnership` false, the `button` prop on BannerInner is
    // `undefined`, so its `v-if="button"` drops the action entirely. No
    // button rendered means the banner is informational only.
    expect(await banner.locator('button').count()).toBe(0)

    await page.close()
  })
})
