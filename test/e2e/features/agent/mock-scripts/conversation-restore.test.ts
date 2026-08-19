import { afterAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../../support/session'
import { setupEditorE2E } from '../../../support/setup'
import { openSidebar } from '../../../support/sidebar'
import {
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

/**
 * Pins the conversation persistence round trip: a completed turn is saved via
 * `adapter.agentConversations.upsert`, and re-opening the editor auto-restores
 * it — client items re-render AND the server accepts the `restore_conversation`
 * snapshot (HMAC hash verification included, since a tampered or mis-hashed
 * snapshot would be silently rejected and render nothing).
 *
 * Also pins the DELIBERATE cross-language behaviour: conversations are keyed
 * by entity only, NOT by language. Opening the German translation of the same
 * page restores the conversation started on the English source — the agent is
 * meant to keep its context when the user switches to a translation (e.g. to
 * translate the page with full knowledge of the preceding conversation).
 *
 * Mechanics worth knowing:
 *  - Auto-restore is intentionally skipped in mock-driven sessions, so the
 *    restore pages are opened WITHOUT a mock script (a fresh `openEditor`
 *    clears the window global). No prompt is sent on those pages — sending
 *    would require a real API key.
 *  - `openAgentPanel` clicks "new conversation" when one is visible — exactly
 *    what a restore test must not do. The restore pages use `openSidebar`
 *    directly.
 *  - This file owns page 2 (see `entityStorage.ts`): `loadLatest` returns the
 *    newest conversation for the entity, so any other test persisting turns
 *    against the same page would make the restored content nondeterministic.
 *
 * Test 2 reuses the conversation persisted by test 1 (file-sequential).
 */
describe('agent: conversation restore across reloads and languages', async () => {
  await setupEditorE2E()

  const PATH_EN = '/page/2?blokkliEditing=2&testing=true'
  const PATH_DE = '/de/page/2?blokkliEditing=2&testing=true'
  const REPLY = 'Restored scripted reply.'

  const openPages: Page[] = []

  async function track<T extends Page>(page: T): Promise<T> {
    openPages.push(page)
    return page
  }

  afterAll(async () => {
    await Promise.all(openPages.map((p) => p.close().catch(() => undefined)))
  })

  test('a completed conversation is auto-restored after a reload', async () => {
    // Run one scripted turn and let it persist.
    const writer = await track(await openEditor(PATH_EN))
    const script: MockScript = [
      { type: 'user', content: 'remember this conversation' },
      { type: 'agent', content: [{ type: 'text', text: REPLY }] },
    ]
    await setAgentMockScript(writer, script)
    await openAgentPanel(writer)
    await submitAgentPrompt(writer, 'remember this conversation')
    await waitForAgentReply(writer, REPLY)

    // The save is an async $fetch after the turn completes — wait until the
    // adapter actually has it before opening the restore page.
    await expect
      .poll(
        async () => {
          const latest = await writer.request
            .get(
              'http://localhost:3000/api/blokkli/agent/conversations/latest?entityType=content&entityUuid=2',
            )
            .then((r) => r.json() as Promise<{ title?: string } | null>)
            .catch(() => null)
          return latest?.title ?? null
        },
        { timeout: 10000 },
      )
      .toContain('remember this conversation')

    // Fresh page, no mock script → auto-restore path runs.
    const reader = await track(await openEditor(PATH_EN))
    await openSidebar(reader, 'agent')

    await expect
      .poll(
        () =>
          reader
            .locator('[data-test="agent-assistant-message"]')
            .last()
            .textContent()
            .catch(() => null),
        { timeout: 10000 },
      )
      .toContain(REPLY)
  })

  test('the same conversation is restored on the translation (not language-scoped)', async () => {
    const reader = await track(await openEditor(PATH_DE))
    await openSidebar(reader, 'agent')

    await expect
      .poll(
        () =>
          reader
            .locator('[data-test="agent-assistant-message"]')
            .last()
            .textContent()
            .catch(() => null),
        { timeout: 10000 },
      )
      .toContain(REPLY)
  })
})
