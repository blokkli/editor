import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterEach, beforeAll, describe, it } from 'vitest'
import type { MockScript } from '#blokkli/agent/shared/types'
import {
  openAgentPanel,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../support/agent'
import { openSidebar } from '../../support/sidebar'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The page "Library" (content/nodes/translated.yml), in English and German.
const PATH_EN = editorPath('/en/library', 'translated')
const PATH_DE = editorPath('/de/bibliothek', 'translated')
const PROMPT = 'Remember this conversation.'
const REPLY = 'Restored scripted reply.'

/**
 * Drupal saves the conversation after every turn, and the agent restores the
 * latest one when the editor opens again: the client's items, and the server's
 * snapshot (whose hash it verifies; a rejected snapshot would show nothing).
 *
 * Conversations belong to the node, not to a language: the German translation
 * restores the conversation started in English, so that the agent keeps its
 * context while the page is translated.
 *
 * The reading pages have a script with a `restore` entry (scripted sessions
 * otherwise start empty) and send no prompt. They open the panel with
 * `openSidebar`: `openAgentPanel` starts a new conversation.
 *
 * The second test reads what the first one saved.
 */
describe('Agent conversations', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  const restore: MockScript = [{ type: 'restore' }]
  const pages: Page[] = []

  beforeAll(() => {
    resetSandbox(sandbox)
  })

  afterEach(async () => {
    await Promise.all(pages.splice(0).map((page) => page.close()))
  })

  async function open(path: string, mockScript: MockScript): Promise<Page> {
    const page = await openEditor(sandbox, 'Anna Keller', path, { mockScript })
    pages.push(page)
    return page
  }

  it('are restored when the editor opens again', async () => {
    const writer = await open(PATH_EN, [
      { type: 'user', content: PROMPT },
      { type: 'agent', content: [{ type: 'text', text: REPLY }] },
    ])
    // Saved after the turn: the save with the reply.
    const saved = nextMutation(
      writer,
      'pbAgentConversationUpsert',
      (variables) => variables.dataUser.includes(REPLY),
    )
    await openAgentPanel(writer)
    await submitAgentPrompt(writer, PROMPT)
    await waitForAgentReply(writer, REPLY)
    await saved

    const reader = await open(PATH_EN, restore)
    await openSidebar(reader, 'agent')
    await waitForAgentReply(reader, REPLY)
  })

  it('are restored in the translation', async () => {
    const reader = await open(PATH_DE, restore)
    await openSidebar(reader, 'agent')
    await waitForAgentReply(reader, REPLY)
  })
})
