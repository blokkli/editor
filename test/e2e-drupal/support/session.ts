import { createPage, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { MockScript } from '#blokkli/agent/shared/types'
import { waitForEditorReady, withApp } from '../../e2e/support/session'
import { loginPath, seedUuid } from './sandbox'

/** The users of the fixtures (content/users.yml), one per role. */
export type TestUser =
  | 'Anna Keller'
  | 'Lea Steiner'
  | 'Marc Brunner'
  | 'Élodie Favre'
  | 'Jonas Weber'

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
