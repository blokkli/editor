import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { blockCount } from '../../../e2e/support/blocks'
import {
  getAgentTranscript,
  openAgentPanel,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../e2e/support/agent'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { claimEditState, editorPath, openEditor } from '../../support/session'

const EMPTY_PATH = editorPath('/en/empty', 'empty')

/**
 * The execution-time mode guard: per-turn filtering keeps out-of-mode tools
 * away from the LLM, but a tool_use can still arrive for one — replayed from a
 * restored history, hallucinated, or (as scripted here) simply produced by the
 * provider. The server must refuse it with a tool error instead of dispatching
 * it to the client, and the loop must continue normally.
 *
 * Setup: a read-only session (Lea on the page "Empty", whose edit state is
 * Anna's) whose scripted first agent turn calls `add_paragraphs`, an
 * editing-only mutation tool. The guard fires before input validation and
 * before any `tool_call` reaches the client, so no approval UI appears and no
 * block is created.
 */
describe('agent: refuses out-of-mode tool calls at execution time', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    await claimEditState(sandbox, 'Anna Keller', EMPTY_PATH)
    page = await openEditor(sandbox, 'Lea Steiner', EMPTY_PATH, {
      mockScript: [
        { type: 'user', content: 'add a text block' },
        {
          type: 'agent',
          content: [
            { type: 'text', text: 'Adding a block now.' },
            {
              type: 'tool_use',
              id: 'tu_forbidden',
              name: 'add_paragraphs',
              input: {
                parent: {
                  type: 'node',
                  uuid: seedUuid('node', 'empty'),
                  fieldName: 'field_paragraphs',
                },
                paragraphs: [{ bundle: 'text' }],
              },
            },
          ],
        },
        // The error relay goes back to the "LLM"; the mock then plays this
        // turn, proving the loop survived the refusal.
        {
          type: 'agent',
          content: [{ type: 'text', text: 'Understood, page is read-only.' }],
        },
      ],
    })
  })

  afterAll(async () => {
    await page.close()
  })

  test('mutation tool_use in readonly gets a tool error, loop continues', async () => {
    await openAgentPanel(page)

    await submitAgentPrompt(page, 'add a text block')
    await waitForAgentReply(page, 'Understood, page is read-only.')

    // The refusal reached the LLM as an is_error tool result naming the mode…
    const transcript = await getAgentTranscript(page)
    const toolResults = transcript.messages
      .filter((m) => m.type === 'user' && Array.isArray(m.seen))
      .flatMap(
        (m) =>
          m.seen as { type: string; content?: string; is_error?: boolean }[],
      )
      .filter((block) => block.type === 'tool_result')
    expect(toolResults).toHaveLength(1)
    expect(toolResults[0]!.is_error).toBe(true)
    const payload = JSON.parse(toolResults[0]!.content!) as { error: string }
    expect(payload.error).toContain(
      'is not available in the current edit mode ("readonly")',
    )

    // …and the mutation never ran: no block was created, and add_paragraphs
    // was never offered to the LLM in the first place.
    expect(await blockCount(page)).toBe(0)
    expect(transcript.tools.map((t) => t.name)).not.toContain('add_paragraphs')
  })
})
