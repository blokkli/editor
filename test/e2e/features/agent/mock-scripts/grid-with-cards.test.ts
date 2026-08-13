import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH_EMPTY, openEditor } from '../../../support/session'
import { setupEditorE2E } from '../../../support/setup'
import { pageStructure } from '../../../support/blocks'
import {
  answerAgentQuestion,
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

/**
 * End-to-end test of an `ask_question` → `add_paragraphs` flow against an
 * empty page. The mock provider replays three agent turns:
 *
 *   1. Ask the user which title to use (`ask_question` with 3 options).
 *   2. Add a grid containing the chosen title + 3 cards (`add_paragraphs`).
 *   3. Confirm the operation is done.
 *
 * The mock provider ignores user input at replay time — turn 2 plays
 * regardless of which option the user picks. The test simulates picking the
 * first option, then asserts the grid + nested children landed on page 4's
 * `content` field with the correct host/field linkage.
 */
describe('agent: grid with cards via ask_question', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH_EMPTY)
  })

  afterAll(async () => {
    await page.close()
  })

  test('asks for a title, then adds a grid with title + 3 cards', async () => {
    const script: MockScript = [
      {
        type: 'user',
        content:
          'Create a new grid with a title and 3 cards about the new blökkli AI feature.',
      },
      {
        type: 'agent',
        content: [
          { type: 'text', text: 'Sure! Which title fits best?' },
          {
            type: 'tool_use',
            id: 'tu_ask',
            name: 'ask_question',
            input: {
              question: 'Which title fits best?',
              options: [
                {
                  value: 'agent',
                  label: 'Meet your new blökkli AI agent',
                },
                { value: 'partner', label: 'Your AI editing partner' },
                {
                  value: 'magic',
                  label: 'AI magic, built into blökkli',
                },
              ],
              multiSelect: false,
            },
          },
        ],
      },
      {
        type: 'agent',
        content: [
          { type: 'text', text: 'Adding the grid now.' },
          {
            type: 'tool_use',
            id: 'tu_add',
            name: 'add_paragraphs',
            input: {
              parent: { type: 'content', uuid: '4', field: 'content' },
              position: 'end',
              paragraphs: [
                {
                  bundle: 'grid',
                  children: {
                    header: [
                      {
                        bundle: 'title',
                        contentFields: {
                          title: 'Meet your new blökkli AI agent',
                        },
                      },
                    ],
                    blocks: [
                      {
                        bundle: 'card',
                        contentFields: {
                          title: 'Conversational editing',
                          text: 'Ask in natural language and let the agent rearrange your page.',
                        },
                      },
                      {
                        bundle: 'card',
                        contentFields: {
                          title: 'Tool-aware actions',
                          text: 'The agent understands page structure and calls real tools.',
                        },
                      },
                      {
                        bundle: 'card',
                        contentFields: {
                          title: 'Always in your control',
                          text: 'Every mutation is auditable and reversible from the editor toolbar.',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
      {
        type: 'agent',
        content: [{ type: 'text', text: 'Done! Your grid has been added.' }],
      },
    ]

    await setAgentMockScript(page, script)
    await openAgentPanel(page)
    await submitAgentPrompt(
      page,
      'Create a new grid with a title and 3 cards about the new blökkli AI feature.',
    )

    await answerAgentQuestion(page, 'agent')

    await waitForAgentReply(page, 'Done!')

    expect(await pageStructure(page)).toMatchInlineSnapshot(`
      [
        {
          "bundle": "grid",
          "fields": {
            "blocks": [
              {
                "bundle": "card",
                "props": {
                  "text": "Ask in natural language and let the agent rearrange your page.",
                  "title": "Conversational editing",
                },
              },
              {
                "bundle": "card",
                "props": {
                  "text": "The agent understands page structure and calls real tools.",
                  "title": "Tool-aware actions",
                },
              },
              {
                "bundle": "card",
                "props": {
                  "text": "Every mutation is auditable and reversible from the editor toolbar.",
                  "title": "Always in your control",
                },
              },
            ],
            "header": [
              {
                "bundle": "title",
                "props": {
                  "lead": "At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren.",
                  "tagline": "Tagline",
                  "title": "Meet your new blökkli AI agent",
                },
              },
            ],
          },
        },
      ]
    `)
  })
})
