import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, waitForEditorReady, withApp } from './support/session'
import { setupEditorE2E } from './support/setup'
import { emitEvent } from './support/events'

/**
 * Sidebar container lifecycle (Toolbar teleport targets + PluginSidebar).
 *
 * The containers (`sidebar-content-right` etc.) are Teleport targets: they
 * must always exist in the DOM, but they must only be VISIBLE while a mounted,
 * enabled `PluginSidebar` is actually open in that region. The persisted
 * `sidebar:active:*` storage value can go stale — the sidebar can unmount
 * mid-session (debug feature toggled off), be disabled by the edit mode
 * (edit-only sidebars in translating mode) or not exist at all in a later
 * session — and a stale value must never show an empty container.
 */
describe('Sidebar containers', async () => {
  await setupEditorE2E()

  let page: Page
  let enUrl: string

  beforeAll(async () => {
    page = await openEditor()
    enUrl = page.url()
  })

  afterAll(async () => {
    await page.close()
  })

  beforeEach(async () => {
    if (page.url() !== enUrl) {
      await page.goto(enUrl)
      await waitForEditorReady(page)
    }
  })

  afterEach(async () => {
    await emitEvent(page, 'sidebar:close')
    await withApp(page, (app) => {
      if (app.debug.isEnabled.value) {
        app.debug.toggle()
      }
    })
  })

  test('the container hides when the open sidebar unmounts', async () => {
    const container = page.locator('[data-test="sidebar-content-right"]')
    expect(await container.isVisible()).toBe(false)

    // Enable the debug feature and open its sidebar through its tab button.
    await withApp(page, (app) => app.debug.toggle())
    await page.locator('[data-test="sidebar-button-debug"]').click()
    await page
      .locator('[data-test="sidebar-title-debug"]')
      .waitFor({ state: 'visible' })
    expect(await container.isVisible()).toBe(true)

    // Disabling the feature unmounts its PluginSidebar while it's open.
    await withApp(page, (app) => app.debug.toggle())
    await page
      .locator('[data-test="sidebar-title-debug"]')
      .waitFor({ state: 'detached' })

    // The container stays in the DOM (it's a Teleport target) but is hidden.
    await expect.poll(() => container.isVisible()).toBe(false)
    expect(await container.count()).toBe(1)
  })

  test('a persisted sidebar id that no longer exists never shows the container', async () => {
    // "One week later": storage says the debug sidebar was open, but the debug
    // feature is disabled in this session, so no sidebar registers for the id.
    const stalePage = await openEditor(undefined, {
      localStorage: {
        'blokkli:sidebar:active:right': JSON.stringify('debug'),
      },
    })
    try {
      const container = stalePage.locator('[data-test="sidebar-content-right"]')
      expect(await container.count()).toBe(1)
      expect(await container.isVisible()).toBe(false)

      // Prove the seed hit the real storage key (else this test would pass
      // vacuously): once the debug feature mounts its sidebar again, the
      // persisted value takes effect and the pane opens.
      await withApp(stalePage, (app) => app.debug.toggle())
      await stalePage
        .locator('[data-test="sidebar-title-debug"]')
        .waitFor({ state: 'visible' })
      expect(await container.isVisible()).toBe(true)
    } finally {
      await stalePage.close()
    }
  })

  // Runs LAST in this page: it ends on the /de route (beforeEach navigates
  // back, but keeping it last spares the other tests that goto).
  test('an edit-only sidebar closes when switching to a translation', async () => {
    const container = page.locator('[data-test="sidebar-content-right"]')
    await page.locator('[data-test="sidebar-button-media_library"]').click()
    await page
      .locator('[data-test="sidebar-title-media_library"]')
      .waitFor({ state: 'visible' })
    expect(await container.isVisible()).toBe(true)

    // Switch to DE via the language switcher (dropdown or inline variant).
    const toggle = page.locator('[data-test="language-switcher-toggle"]')
    if ((await toggle.count()) > 0) {
      await toggle.click()
    }
    await page.locator('[data-test="language-switcher-option-de"]').click()
    await page.waitForURL(/\/de(\?|$)/)
    await waitForEditorReady(page)
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    // The media library is edit-only, so in translating mode it's disabled:
    // not open, and the container is hidden (still present as Teleport target).
    await page
      .locator('[data-test="sidebar-title-media_library"]')
      .waitFor({ state: 'detached' })
    await expect.poll(() => container.isVisible()).toBe(false)
    expect(await container.count()).toBe(1)
  })
})
