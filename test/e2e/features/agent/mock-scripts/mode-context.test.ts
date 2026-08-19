import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  EDITOR_PATH,
  EDITOR_PATH_EMPTY,
  openEditor,
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
import {
  OWNERSHIP_OVERRIDE_KEY,
  type OwnershipOverride,
} from '../../../../../playground/app/mock/ownershipOverride'

/**
 * Pins how the agent session reflects the editor's edit mode — the LLM-facing
 * contract that must survive the move of tool/mode filtering from client init
 * to the server:
 *
 *  - which tools are offered to the LLM (`transcript.tools` = eager tools of
 *    the mode; `available-tools` system section = lazy tools of the mode)
 *  - what the system prompt says about the edit mode and content language
 *    (`page-context` section)
 *
 * One page per mode: editing (empty page as owner), translating (/de of the
 * demo page), readonly (demo page with the ownership override so the current
 * user is not the owner). Each runs a single scripted turn — `lastTools` and
 * the transcript only exist after an LLM request.
 *
 * Representative tools per filter dimension:
 *  - `add_paragraphs`  eager, editing-only
 *  - `auto_translate_paragraphs`  eager, translating-only
 *  - `ask_question`  eager, all modes
 *  - `update_text_fields`  lazy, editing+translating
 *  - `delete_paragraphs`  lazy, editing-only
 *  - `get_page_structure`  lazy, all modes
 */
describe('agent: edit mode context and tool availability', async () => {
  await setupEditorE2E()

  let editingPage: Page
  let translatingPage: Page
  let readonlyPage: Page

  function ownershipEntry(override: OwnershipOverride) {
    return { [OWNERSHIP_OVERRIDE_KEY]: JSON.stringify(override) }
  }

  beforeAll(async () => {
    ;[editingPage, translatingPage, readonlyPage] = await Promise.all([
      openEditor(EDITOR_PATH_EMPTY),
      openEditor('/de/page/1?blokkliEditing=1&testing=true'),
      openEditor(EDITOR_PATH, {
        localStorage: ownershipEntry({
          currentUserIsOwner: false,
          ownerName: 'Alice Example',
        }),
      }),
    ])
  })

  afterAll(async () => {
    await Promise.all([
      editingPage.close(),
      translatingPage.close(),
      readonlyPage.close(),
    ])
  })

  async function runTurnAndGetTranscript(page: Page): Promise<Transcript> {
    const script: MockScript = [
      { type: 'user', content: 'hello' },
      { type: 'agent', content: [{ type: 'text', text: 'Scripted reply.' }] },
    ]
    await setAgentMockScript(page, script)
    await openAgentPanel(page)
    await submitAgentPrompt(page, 'hello')
    await waitForAgentReply(page, 'Scripted reply.')
    return getAgentTranscript(page)
  }

  function systemSection(transcript: Transcript, id: string): string {
    const section = transcript.system.find((s) => s.id === id)
    expect(section, `system prompt section "${id}"`).toBeTruthy()
    return section!.content
  }

  /**
   * The `available-tools` section lists each lazy tool as a `### \`name\``
   * heading. Match that form — tool DESCRIPTIONS legitimately mention other
   * tools by name (e.g. get_readability_issues says "call update_text_fields
   * directly"), so a bare substring check false-positives.
   */
  function lazyToolHeading(name: string): string {
    return '### `' + name + '`'
  }

  test('editing mode offers mutation tools and says so', async () => {
    const transcript = await runTurnAndGetTranscript(editingPage)
    const tools = transcript.tools.map((t) => t.name)

    expect(tools).toContain('add_paragraphs')
    expect(tools).toContain('ask_question')
    expect(tools).not.toContain('auto_translate_paragraphs')

    const pageContext = systemSection(transcript, 'page-context')
    expect(pageContext).toContain('full editing access')
    expect(pageContext).toContain(
      'language code for content on this page is "en"',
    )

    const lazyTools = systemSection(transcript, 'available-tools')
    expect(lazyTools).toContain(lazyToolHeading('update_text_fields'))
    expect(lazyTools).toContain(lazyToolHeading('delete_paragraphs'))
  })

  test('translating mode offers translation tools, no structural mutations', async () => {
    const transcript = await runTurnAndGetTranscript(translatingPage)
    const tools = transcript.tools.map((t) => t.name)

    expect(tools).toContain('auto_translate_paragraphs')
    expect(tools).toContain('ask_question')
    expect(tools).not.toContain('add_paragraphs')

    const pageContext = systemSection(transcript, 'page-context')
    expect(pageContext).toContain('translating the page content')
    expect(pageContext).toContain(
      'language code for content on this page is "de"',
    )

    const lazyTools = systemSection(transcript, 'available-tools')
    expect(lazyTools).toContain(lazyToolHeading('update_text_fields'))
    expect(lazyTools).not.toContain(lazyToolHeading('delete_paragraphs'))
  })

  test('readonly mode (not the edit state owner) offers no mutation tools', async () => {
    const transcript = await runTurnAndGetTranscript(readonlyPage)
    const tools = transcript.tools.map((t) => t.name)

    expect(tools).toContain('ask_question')
    expect(tools).not.toContain('add_paragraphs')
    expect(tools).not.toContain('auto_translate_paragraphs')

    const pageContext = systemSection(transcript, 'page-context')
    expect(pageContext).toContain('read-only access')

    const lazyTools = systemSection(transcript, 'available-tools')
    expect(lazyTools).toContain(lazyToolHeading('get_page_structure'))
    expect(lazyTools).not.toContain(lazyToolHeading('update_text_fields'))
    expect(lazyTools).not.toContain(lazyToolHeading('delete_paragraphs'))
  })
})
