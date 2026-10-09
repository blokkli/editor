import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import type { MockScript } from '#blokkli/agent/shared/types'
import { pageStructure } from '../../../e2e/support/blocks'
import {
  answerAgentQuestion,
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
import { editorPath, openEditor } from '../../support/session'

const PROMPT =
  'Create columns with a title and 3 texts about the new blökkli AI feature.'

const SCRIPT: MockScript = [
  {
    type: 'user',
    content: PROMPT,
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
      { type: 'text', text: 'Adding the columns now.' },
      {
        type: 'tool_use',
        id: 'tu_add',
        name: 'add_paragraphs',
        input: {
          parent: {
            type: 'node',
            uuid: seedUuid('node', 'empty'),
            field: 'field_paragraphs',
          },
          position: 'end',
          paragraphs: [
            {
              bundle: 'columns',
              children: {
                field_left: [
                  {
                    bundle: 'title',
                    contentFields: {
                      field_title: 'Meet your new blökkli AI agent',
                    },
                  },
                ],
                field_right: [
                  {
                    bundle: 'text',
                    contentFields: {
                      field_text:
                        'Ask in natural language and let the agent rearrange your page.',
                    },
                  },
                  {
                    bundle: 'text',
                    contentFields: {
                      field_text:
                        'The agent understands page structure and calls real tools.',
                    },
                  },
                  {
                    bundle: 'text',
                    contentFields: {
                      field_text:
                        'Every mutation is auditable and reversible from the editor toolbar.',
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
    content: [{ type: 'text', text: 'Done! Your columns have been added.' }],
  },
]

/**
 * End-to-end test of an `ask_question` → `add_paragraphs` flow against an
 * empty page ("Empty", content/nodes/empty.yml). The mock provider replays
 * three agent turns:
 *
 *   1. Ask the user which title to use (`ask_question` with 3 options).
 *   2. Add columns with the chosen title on the left and 3 texts on the right
 *      (`add_paragraphs`).
 *   3. Confirm the operation is done.
 *
 * The mock provider ignores user input at replay time — turn 2 plays
 * regardless of which option the user picks. The test simulates picking the
 * first option, then asserts the columns + nested children landed in the
 * node's `field_paragraphs` with the correct host/field linkage.
 */
describe('agent: ask_question, then add_paragraphs', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/empty', 'empty'),
      { mockScript: SCRIPT },
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test('asks for a title, then adds columns with a title and 3 texts', async () => {
    await openAgentPanel(page)
    await submitAgentPrompt(page, PROMPT)

    await answerAgentQuestion(page, 'agent')

    // The reply comes after the tool's mutation, so Drupal has stored it.
    await waitForAgentReply(page, 'Done!')

    expect(await pageStructure(page, { rootField: 'field_paragraphs' }))
      .toMatchInlineSnapshot(`
      [
        {
          "bundle": "columns",
          "fields": {
            "field_left": [
              {
                "bundle": "title",
                "props": {
                  "title": "Meet your new blökkli AI agent",
                },
              },
            ],
            "field_right": [
              {
                "bundle": "text",
                "props": {
                  "text": "Ask in natural language and let the agent rearrange your page.",
                },
              },
              {
                "bundle": "text",
                "props": {
                  "text": "The agent understands page structure and calls real tools.",
                },
              },
              {
                "bundle": "text",
                "props": {
                  "text": "Every mutation is auditable and reversible from the editor toolbar.",
                },
              },
            ],
          },
        },
      ]
    `)
  })
})
