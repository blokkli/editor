import { createPage, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import type { MockScript } from '#blokkli/agent/shared/types'
import { waitForEditorReady } from '../../e2e/support/session'
import { loginPath, seedUuid } from './sandbox'

/** The page "Blocks" (content/nodes/blocks.yml) in the editor. */
export const BLOCKS_EDITOR_PATH = `/en/blocks?blokkliEditing=${seedUuid('node', 'blocks')}`

export type OpenEditorOptions = {
  /**
   * The agent's script (see the agent-e2e-testing skill). Without one, the
   * agent gets an empty script: it answers nothing.
   */
  mockScript?: MockScript
}

/**
 * Logs the user into the sandbox, then opens the path in the editor.
 *
 * The agent always has a mock script, so no spec reaches the model. DeepL
 * can't be reached from an E2E sandbox at all (settings.php).
 */
export async function openEditor(
  sandbox: string,
  user: string,
  path: string,
  opts: OpenEditorOptions = {},
): Promise<Page> {
  const page = await createPage(undefined, { ignoreHTTPSErrors: true })
  await page.addInitScript((script) => {
    localStorage.setItem('blokkli:popup:agent:closed', 'true')
    localStorage.setItem('blokkli:popup:tour:closed', 'true')
    window.__BLOKKLI_AGENT_MOCK_SCRIPT__ = script
  }, opts.mockScript ?? [])
  await page.goto(url(loginPath(sandbox, user, path)))
  await waitForEditorReady(page)
  return page
}
