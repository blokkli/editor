import { createPage, url } from '@nuxt/test-utils/e2e'
import type { JSHandle, Page } from 'playwright-core'
import type { BlokkliApp } from '../../../src/runtime/editor/types/app'
import type { EntityContext } from '../../../src/runtime/types'
import {
  PERMISSION_OVERRIDES_KEY,
  type PermissionOverrides,
} from '../../../playground/app/mock/permissionOverrides'
import { emitEvent } from './events'

// `window.__BLOKKLI__` is typed by its real augmentations, both pulled into
// scope by `test/e2e/tsconfig.json`: the global `Window` augmentation +
// `BlokkliGlobalWindowObject` (with `app`) from `useGlobalBlokkliObject`, and
// the playground's `test` namespace augmentation (test-cases `global.d.ts`).
// No local re-declaration — that would conflict with the real type.

/**
 * Default playground editor route (entity `1`, edit mode on). `testing=true`
 * puts the mock adapter in E2E mode: it records selected adapter calls and,
 * crucially, does not restore persisted UI state (e.g. the responsive-preview
 * sidebar the dev user last left open) — so every test starts from the same
 * clean layout. Tests that need the recorder simply read it; tests that need a
 * particular sidebar open it explicitly.
 */
export const EDITOR_PATH = '/page/1?blokkliEditing=1&testing=true'

/**
 * Empty playground editor route (entity `4`, edit mode on). The page has a
 * title and an empty `content` field — useful for tests that need a blank
 * canvas, e.g. asserting the agent adds blocks to an empty page from scratch.
 */
export const EDITOR_PATH_EMPTY = '/page/4?blokkliEditing=4&testing=true'

export interface OpenEditorOptions {
  /**
   * Pin the browser timezone (IANA id, e.g. `'UTC'`). Set at context creation
   * (before navigation). Pair with `setFixedTime` so a fixed instant maps to a
   * known local date/time regardless of the host machine.
   */
  timezoneId?: string

  /**
   * Override the mock adapter's permissions for this session — deny/grant block
   * permissions per bundle, or replace the user permissions. Seeded into
   * localStorage before navigation, because the permissions provider reads them
   * once at editor init. Requires the `testing=true` query (the default
   * `EDITOR_PATH` has it). See `playground/app/mock/permissionOverrides.ts`.
   */
  permissions?: PermissionOverrides

  /**
   * Seed arbitrary `localStorage` key/value pairs before navigation, for mock
   * adapter state the editor reads once at init (e.g. the entity published flag
   * `blokkli:test:entityStatus`, or a scheduled-publish key
   * `blokkli_schedule_<type>_<uuid>`). Test-only seams are gated by the
   * `testing=true` query.
   */
  localStorage?: Record<string, string>
}

/**
 * Open the editor and wait until it has mounted and exposed its API on
 * `window.__BLOKKLI__.app`. Returns the Playwright page.
 *
 * Onboarding popups (the tour and the agent intro) are pre-dismissed via
 * localStorage before navigation — otherwise they overlay the bottom-right of
 * the editor and intercept clicks on the DiffApproval toolbar. The keys mirror
 * the `Popup` component's `popup:<id>:closed` storage (prefixed with `blokkli:`).
 */
export async function openEditor(
  path: string = EDITOR_PATH,
  opts: OpenEditorOptions = {},
): Promise<Page> {
  const page = await createPage(
    undefined,
    opts.timezoneId ? { timezoneId: opts.timezoneId } : undefined,
  )
  await page.addInitScript(() => {
    localStorage.setItem('blokkli:popup:agent:closed', 'true')
    localStorage.setItem('blokkli:popup:tour:closed', 'true')
  })
  if (opts.permissions) {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: PERMISSION_OVERRIDES_KEY, value: opts.permissions },
    )
  }
  if (opts.localStorage) {
    await page.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value)
      }
    }, opts.localStorage)
  }
  await page.goto(url(path), { waitUntil: 'hydration' })
  await waitForEditorReady(page)
  return page
}

/**
 * Wait until the editor is mounted and the full-screen init/loading overlay
 * (`data-test="init-overlay"`) has detached. `openEditor` already does this
 * after its initial `page.goto`, but a test that navigates to another route
 * (e.g. `/en/page/1` → `/de/page/1`) needs to wait again before interacting.
 *
 * Until the overlay detaches it covers the viewport and intercepts pointer
 * input — `.click()` auto-retries past it but raw mouse drags don't.
 */
export async function waitForEditorReady(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  await page
    .locator('[data-test="init-overlay"]')
    .waitFor({ state: 'detached' })
}

/**
 * Pin the browser clock to a fixed instant (anything `Date` accepts), making
 * time-dependent UI (e.g. the publish scheduler's future-date validation)
 * deterministic. Only `Date.now()`/`new Date()` are faked — timers and rAF keep
 * running, so transitions and the canvas still work.
 *
 * Call this AFTER any pointer-driven interaction (the drag's move-throttling
 * compares `Date.now()` deltas, so a frozen clock stalls it) and BEFORE the UI
 * under test reads the time. Pair with `openEditor`'s `timezoneId` so the fixed
 * instant maps to a known local date.
 */
export function setFixedTime(
  page: Page,
  now: Date | number | string,
): Promise<void> {
  return page.clock.setFixedTime(now)
}

/**
 * Run `fn` in the page with the resolved blökkli editor app, waiting for it to
 * be exposed first. The app is bridged in as a real argument (via a JSHandle),
 * so `fn` receives a fully-typed `BlokkliApp` — no `window.__BLOKKLI__!.app!`
 * boilerplate or casts at the call site.
 *
 * `fn` is serialized and runs in the browser, so it must be self-contained (no
 * Node closures) — `app` is its only input. It may return a value or a Promise;
 * the resolved value is returned. Use this for AWAITED one-shot reads/actions;
 * for a fire-before-the-action listener (`nextEditableOpen`) the registration
 * must be a single synchronous evaluate, so that one stays direct.
 */
export async function withApp<T>(
  page: Page,
  fn: (app: BlokkliApp) => T | Promise<T>,
): Promise<T> {
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  const handle: JSHandle<BlokkliApp> = await page.evaluateHandle(
    () => window.__BLOKKLI__!.app!,
  )
  try {
    return await page.evaluate(fn, handle)
  } finally {
    await handle.dispose()
  }
}

/** The host entity's context (type/bundle/uuid), read from the live editor. */
export function getHostContext(page: Page): Promise<EntityContext> {
  return withApp(page, (app) => {
    const ctx = app.context.value
    return {
      type: ctx.entityType,
      bundle: ctx.entityBundle,
      uuid: ctx.entityUuid,
    }
  })
}

/**
 * Reset the editor to a pristine session without reloading the page.
 *
 * The playground's `EditState` persists its mutation list AND current index
 * to `__30_blokkli_mock_1_{mutations,index}` localStorage keys (so an
 * accidental tab refresh keeps your work). The mock EditState is a singleton
 * keyed `1` whatever page is edited. Clearing those keys and emitting
 * `reloadState` makes the editor re-read the mock and arrive at an empty
 * mutation list in ~200ms, instead of the ~2s a `page.reload()` costs.
 */
export async function resetMockState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('__30_blokkli_mock_1_mutations')
    localStorage.removeItem('__30_blokkli_mock_1_index')
  })
  await emitEvent(page, 'reloadState')
  await page.waitForFunction(
    () => window.__BLOKKLI__?.app?.state.mutations.value.length === 0,
  )
}
