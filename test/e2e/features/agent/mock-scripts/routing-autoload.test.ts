import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH_EMPTY, openEditor } from '../../../support/session'
import { setupEditorE2E } from '../../../support/setup'
import {
  getAgentTranscript,
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

/**
 * Verifies the routing preprocess endpoint flows through end-to-end in mock
 * mode: the script's `routing` entry is forwarded to `/api/blokkli/agent/route`
 * in the request body, the server short-circuits to it (without touching the
 * configured LLM), and the listed skills + lazy tools get auto-activated on
 * the session before the first turn.
 *
 * Both halves of the auto-load path are tested in one go:
 *
 * - **Direct tool auto-load**: `search_text` is a lazy tool — without
 *   auto-load it would NOT appear in the session's `tools` list. Its
 *   presence in the fetched transcript proves the routing fired and the
 *   tool was activated.
 * - **Skill auto-load**: `assess-and-fix-readability` declares three lazy
 *   tools of its own. Loading the skill must (a) inject a `skill` content
 *   block into the first user message, and (b) transitively activate every
 *   tool the skill declares, so they too land in the LLM's tools list.
 */
describe('agent: routing auto-loads skills + lazy tools', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH_EMPTY)
  })

  afterAll(async () => {
    await page.close()
  })

  test('preloaded tool + skill (with declared tools) both land in the LLM context', async () => {
    const script: MockScript = [
      {
        type: 'routing',
        tools: ['search_text'],
        skills: ['assess-and-fix-readability'],
      },
      { type: 'user', content: 'help me clean up the page' },
      {
        type: 'agent',
        content: [{ type: 'text', text: 'Ready to help.' }],
      },
    ]

    await setAgentMockScript(page, script)
    await openAgentPanel(page)
    await submitAgentPrompt(page, 'help me clean up the page')
    await waitForAgentReply(page, 'Ready to help.')

    const transcript = await getAgentTranscript(page)
    const toolNames = transcript.tools.map((t) => t.name)
    expect(toolNames).toEqual(
      expect.arrayContaining([
        // Direct tool auto-load from `routing.tools`.
        'search_text',
        // Transitive tool auto-load via the skill's `tools` declaration.
        'get_readability_issues',
        'check_readability_for_texts',
        'delegate_text_rewrite',
      ]),
    )

    // Skill content was injected into the first user message as a `skill`
    // content block (`autoLoadedSkillBlocks` in Session.start).
    const firstUserMessage = transcript.messages[0]
    expect(firstUserMessage?.type).toBe('user')
    expect(firstUserMessage?.seen).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'skill',
          name: 'assess-and-fix-readability',
        }),
      ]),
    )
  })
})
