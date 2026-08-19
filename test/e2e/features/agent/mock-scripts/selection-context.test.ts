import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH_EMPTY, openEditor } from '../../../support/session'
import { setupEditorE2E } from '../../../support/setup'
import { addBlock, selectBlocks } from '../../../support/blocks'
import {
  getAgentTranscript,
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

/**
 * The editor selection is reported to the LLM on EVERY message the user
 * writes, not just the first one of a conversation.
 *
 * The marker's absence is meaningful — it tells the agent nothing was
 * selected — so this asserts both directions: a changed selection must produce
 * a new marker on the follow-up message, and clearing the selection must
 * produce no marker at all.
 *
 * Assertions read the real LLM-facing text via `getAgentTranscript`, which
 * round-trips `get_transcript` to the server. `UserPromptMessage` is never
 * compressed by the history projection, so `seen` carries the marker verbatim.
 */
describe('agent: selection context per message', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH_EMPTY)
  })

  afterAll(async () => {
    await page.close()
  })

  test('each user message carries the selection that was live when it was sent', async () => {
    const uuidA = await addBlock(page, { bundle: 'text' })
    const uuidB = await addBlock(page, { bundle: 'text' })
    const uuidC = await addBlock(page, { bundle: 'text' })
    expect(uuidA).toBeTruthy()
    expect(uuidB).toBeTruthy()
    expect(uuidC).toBeTruthy()

    const script: MockScript = [
      { type: 'agent', content: [{ type: 'text', text: 'Reply one.' }] },
      { type: 'agent', content: [{ type: 'text', text: 'Reply two.' }] },
      { type: 'agent', content: [{ type: 'text', text: 'Reply three.' }] },
    ]
    await setAgentMockScript(page, script)
    await openAgentPanel(page)

    // Turn 1 — two blocks selected.
    await selectBlocks(page, [uuidA!, uuidB!])
    await submitAgentPrompt(page, 'first prompt')
    await waitForAgentReply(page, 'Reply one.')

    // Turn 2 — selection changed. This is the regression: previously only
    // the first message carried a marker.
    await selectBlocks(page, [uuidC!])
    await submitAgentPrompt(page, 'second prompt')
    await waitForAgentReply(page, 'Reply two.')

    // Turn 3 — nothing selected.
    await selectBlocks(page, [])
    await submitAgentPrompt(page, 'third prompt')
    await waitForAgentReply(page, 'Reply three.')

    const transcript = await getAgentTranscript(page)
    // Role-`user` entries also include tool relays, whose content is an
    // array — narrow to the plain-text prompts.
    const userTexts = transcript.messages
      .filter((m) => m.type === 'user')
      .map((m) => (typeof m.seen === 'string' ? m.seen : ''))

    const find = (prompt: string): string => {
      const text = userTexts.find((t) => t.includes(prompt))
      expect(text, `no user message containing "${prompt}"`).toBeTruthy()
      return text!
    }

    const first = find('first prompt')
    expect(first).toContain('[Editor selection when this message was sent:')
    expect(first).toContain(uuidA!)
    expect(first).toContain(uuidB!)

    const second = find('second prompt')
    expect(second).toContain('[Editor selection when this message was sent:')
    expect(second).toContain(uuidC!)
    expect(second).not.toContain(uuidA!)

    const third = find('third prompt')
    expect(third).not.toContain('[Editor selection')
  }, 45000)
})
