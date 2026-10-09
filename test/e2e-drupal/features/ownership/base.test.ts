import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { waitForEditorReady, withApp } from '../../../e2e/support/session'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { claimEditState, editorPath, openEditor } from '../../support/session'

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
 * We assert BOTH the DOM outcome and the request — a regression that dropped
 * one half (banner-disappears-but-no-call, or call-fires-but-banner-stuck)
 * would slip past either assertion alone.
 *
 * Page lifecycle: Anna Keller opens the page "Library"
 * (content/nodes/translated.yml) first, so its edit state is hers. Then two
 * pages open in parallel:
 *
 * `leaPage` (Lea Steiner, an editor) serves tests 1 & 2. Test order matters:
 * test 1 just asserts the banner is visible / state has
 * `currentUserIsOwner=false`; test 2 takes ownership and flips the state to
 * `true`, permanently unmounting the banner — so it must run last on this
 * page.
 *
 * `elodiePage` (Élodie Favre, a translator, on the French page) serves test 3
 * only: translators may not take ownership. It opens while Anna still owns the
 * edit state.
 */
describe('Ownership', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let leaPage: Page
  let elodiePage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    await claimEditState(
      sandbox,
      'Anna Keller',
      editorPath('/en/library', 'translated'),
    )
    ;[leaPage, elodiePage] = await Promise.all([
      openEditor(
        sandbox,
        'Lea Steiner',
        editorPath('/en/library', 'translated'),
      ),
      openEditor(
        sandbox,
        'Élodie Favre',
        editorPath('/fr/bibliotheque', 'translated'),
      ),
    ])
  })

  afterAll(async () => {
    await Promise.all([leaPage.close(), elodiePage.close()])
  })

  test('banner appears when current user is not the owner and shows the owner name', async () => {
    const banner = leaPage.locator('[data-test="ownership-banner"]')
    await banner.waitFor({ state: 'visible' })

    // Locale-independent assertion: the displayed owner name is exposed via
    // the data-test attribute. The visible text wraps the name in <strong>
    // and is wrapped in a translated, locale-formatted sentence.
    expect(await banner.getAttribute('data-test-owner-name')).toBe(
      'Anna Keller',
    )

    // Sanity check via the editor state — guarantees the ownership actually
    // wired through `mapState`, not just that the banner happens to render.
    expect(
      await withApp(
        leaPage,
        (app) => app.state.owner.value?.currentUserIsOwner ?? null,
      ),
    ).toBe(false)
  })

  test('clicking "Assign to me" calls takeOwnership, flips ownership state, and dismisses the banner', async () => {
    const banner = leaPage.locator('[data-test="ownership-banner"]')
    await banner.waitFor({ state: 'visible' })

    // BannerInner renders exactly one `data-test="banner-button"` when the
    // `button` prop is truthy — `canTakeOwnership` is true for an editor.
    const taken = nextMutation(leaPage, 'pbTakeOwnership')
    await banner.locator('[data-test="banner-button"]').click()
    await taken

    // Editor's owner state flipped to "current user is owner".
    await expect
      .poll(() =>
        withApp(
          leaPage,
          (app) => app.state.owner.value?.currentUserIsOwner ?? null,
        ),
      )
      .toBe(true)

    // Banner unmounts — `shouldRender` in features/ownership/index.vue gates
    // on `!currentUserIsOwner`, so the Teleport drops it.
    await expect.poll(() => banner.count()).toBe(0)

    // Drupal stored it: the edit state is Lea's after a reload.
    await leaPage.reload()
    await waitForEditorReady(leaPage)
    expect(
      await withApp(
        leaPage,
        (app) => app.state.owner.value?.currentUserIsOwner ?? null,
      ),
    ).toBe(true)
    expect(await banner.count()).toBe(0)
  })

  test('banner shows but the action button is hidden when the user lacks take_ownership permission', async () => {
    const banner = elodiePage.locator('[data-test="ownership-banner"]')
    await banner.waitFor({ state: 'visible' })

    // With `canTakeOwnership` false, the `button` prop on BannerInner is
    // `undefined`, so its `v-if="button"` drops the action entirely. No
    // banner-button rendered means the banner is informational only.
    expect(await banner.locator('[data-test="banner-button"]').count()).toBe(0)
  })
})
