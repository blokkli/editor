import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  EDITOR_PATH_EMPTY,
  openEditor,
  withApp,
} from '../../../support/session'
import { setupEditorE2E } from '../../../support/setup'
import {
  getAgentTranscript,
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript, Transcript } from '#blokkli/agent/shared/types'
import { OWNERSHIP_OVERRIDE_KEY } from '../../../../../playground/app/mock/ownershipOverride'

/**
 * The reported bug: the user opens the editor NOT owning the edit state (agent
 * session starts in readonly), takes ownership mid-conversation, and the agent
 * must follow — mutation tools become available, the system prompt flips to
 * "full editing access", and the next user message carries an
 * `[Editor context changed: …]` note announcing the transition.
 *
 * This works because every user message carries the live page state and the
 * server re-filters tools by edit mode on every turn — nothing is pinned at
 * WebSocket init anymore.
 *
 * Ownership is taken programmatically (the same call the banner button makes,
 * `features/ownership/index.vue`) — the open agent sidebar covers the banner
 * here, and the banner UI has its own coverage in ownership/base.test.ts.
 *
 * The restore→baseline-note path (a resumed conversation gets a full
 * `[Editor context: …]` note) can't be E2E'd: mock sessions deliberately skip
 * auto-restore, and non-mock sessions can't send prompts without an API key.
 * It is covered by `pageStateNote.spec.ts` plus the baseline flag wiring in
 * `Session.restoreConversation`.
 */
describe('agent: follows ownership change mid-conversation', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH_EMPTY, {
      localStorage: {
        [OWNERSHIP_OVERRIDE_KEY]: JSON.stringify({
          currentUserIsOwner: false,
          ownerName: 'Alice Example',
        }),
      },
    })
  })

  afterAll(async () => {
    await page.close()
  })

  function systemSection(transcript: Transcript, id: string): string {
    const section = transcript.system.find((s) => s.id === id)
    expect(section, `system prompt section "${id}"`).toBeTruthy()
    return section!.content
  }

  test('readonly at start, editing tools + context note after taking ownership', async () => {
    const script: MockScript = [
      { type: 'user', content: 'what can you do?' },
      { type: 'agent', content: [{ type: 'text', text: 'Reply one.' }] },
      { type: 'user', content: 'add a text paragraph' },
      { type: 'agent', content: [{ type: 'text', text: 'Reply two.' }] },
    ]
    await setAgentMockScript(page, script)
    await openAgentPanel(page)

    // Turn 1 — not the owner, session is readonly.
    await submitAgentPrompt(page, 'what can you do?')
    await waitForAgentReply(page, 'Reply one.')

    const before = await getAgentTranscript(page)
    expect(systemSection(before, 'page-context')).toContain('read-only access')
    expect(before.tools.map((t) => t.name)).not.toContain('add_paragraphs')

    await withApp(page, (app) =>
      app.state.mutateWithLoadingState(() => app.adapter.takeOwnership!()),
    )
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('editing')

    // Turn 2 — same conversation, same socket. The message carries the
    // fresh page state; the server must re-gate tools and announce the flip.
    await page
      .locator('[data-test="agent-input"] textarea')
      .fill('add a text paragraph')
    await expect
      .poll(() => page.locator('[data-test="agent-submit"]').isEnabled())
      .toBe(true)
    // dispatchEvent instead of click(): after the readonly→editing flip an
    // ongoing animation keeps the button from ever passing Playwright's
    // stability check. The Vue handler still enforces canSubmit.
    await page.locator('[data-test="agent-submit"]').dispatchEvent('click')
    await waitForAgentReply(page, 'Reply two.')

    const after = await getAgentTranscript(page)
    expect(systemSection(after, 'page-context')).toContain(
      'full editing access',
    )
    expect(after.tools.map((t) => t.name)).toContain('add_paragraphs')

    const secondUserMessage = after.messages.find(
      (m) =>
        m.type === 'user' &&
        typeof m.seen === 'string' &&
        m.seen.includes('add a text paragraph'),
    )
    expect(secondUserMessage).toBeTruthy()
    const text = secondUserMessage!.seen as string
    expect(text).toContain('[Editor context changed:')
    expect(text).toContain('"editing"')
    expect(text).toContain('"readonly"')
  }, 30000)
})
