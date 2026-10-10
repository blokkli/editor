import { createPage, url } from '@nuxt/test-utils/e2e'
import type { JSHandle, Page } from 'playwright-core'
import type { MockScript } from '#blokkli/agent/shared/types'
import type { BlokkliApp } from '../../../src/runtime/editor/types/app'
import type { EntityContext } from '../../../src/runtime/types'
import { loginPath, seedUuid } from './sandbox'

/** The users of the fixtures (content/users.yml), one per role. */
export type TestUser =
  | 'Anna Keller'
  | 'Lea Steiner'
  | 'Marc Brunner'
  | 'Élodie Favre'
  | 'Jonas Weber'
  | 'Sara Gerber'
  | 'David Meier'

/** The path of a seeded node in the editor: its alias, with edit mode on. */
export function editorPath(path: string, nodeKey: string): string {
  return `${path}?blokkliEditing=${seedUuid('node', nodeKey)}`
}

/** The page "Blocks" (content/nodes/blocks.yml) in the editor. */
export const BLOCKS_EDITOR_PATH = editorPath('/en/blocks', 'blocks')

export type OpenEditorOptions = {
  /**
   * The agent's script (see the agent-e2e-testing skill). Without one, the
   * agent gets an empty script: it answers nothing. A page that tests the
   * restore of a conversation uses `[{ type: 'restore' }]`.
   */
  mockScript?: MockScript

  /**
   * Pins the browser's timezone (an IANA id, e.g. `'UTC'`). Pair it with
   * `setFixedTime`, so that a fixed instant is a known local time.
   */
  timezoneId?: string

  /**
   * Entries written to localStorage before the editor loads, for what it reads
   * once at init (e.g. the open sidebar, `blokkli:sidebar:active:right`).
   */
  localStorage?: Record<string, string>
}

/**
 * Logs the user into the sandbox, then opens the path in the editor.
 *
 * The agent always has a mock script, so no spec reaches the model. DeepL
 * can't be reached from an E2E sandbox at all (settings.php).
 */
export async function openEditor(
  sandbox: string,
  user: TestUser,
  path: string,
  opts: OpenEditorOptions = {},
): Promise<Page> {
  const page = await createPage(undefined, {
    ignoreHTTPSErrors: true,
    timezoneId: opts.timezoneId,
  })
  await page.addInitScript(
    ({ script, entries }) => {
      localStorage.setItem('blokkli:popup:agent:closed', 'true')
      localStorage.setItem('blokkli:popup:tour:closed', 'true')
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value)
      }
      window.__BLOKKLI_AGENT_MOCK_SCRIPT__ = script
    },
    { script: opts.mockScript ?? [], entries: opts.localStorage ?? {} },
  )
  await page.goto(url(loginPath(sandbox, user, path)))
  await waitForEditorReady(page)
  return page
}

/**
 * Wait until the editor is mounted and the full-screen init/loading overlay
 * (`data-test="init-overlay"`) has detached. `openEditor` already does this
 * after its initial `page.goto`, but a test that navigates to another route
 * (e.g. to a translation) needs to wait again before interacting.
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
 * Makes the user the owner of the page's edit state: they open the path in the
 * editor, which creates it, and close it again. Anyone else then gets a
 * read-only editor there, until they take ownership. Edit states can't be
 * seeded.
 */
export async function claimEditState(
  sandbox: string,
  user: TestUser,
  path: string,
): Promise<void> {
  const page = await openEditor(sandbox, user, path)
  await page.close()
}

/**
 * Discards all changes, as the editor's "Discard" does: Drupal deletes the
 * edit state and starts a new one from what is published, owned by the user
 * who reverted. Cheaper than resetting the sandbox and reopening the editor.
 */
export async function revertAllChanges(page: Page): Promise<void> {
  const reverted = await withApp(page, (app) =>
    app.state.mutateWithLoadingState(() => app.adapter.revertAllChanges!()),
  )
  if (!reverted) {
    throw new Error('Drupal could not revert the changes.')
  }
  await page.waitForFunction(
    () => window.__BLOKKLI__?.app?.state.mutations.value.length === 0,
  )
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
