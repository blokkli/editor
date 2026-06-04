---
description:
  blökkli agent E2E tests — mock-provider scripts, tool-bypass tests, support
  helpers, data-test hooks. Use when writing or debugging tests under
  `test/e2e/features/agent/`.
---

# Agent E2E Testing Skill

How to test the agent module end to end. Two distinct test styles live under
`test/e2e/features/agent/`:

```
test/e2e/features/agent/
├── tools/         # individual tool tests — bypass the LLM
└── mock-scripts/  # full-flow tests — drive the LLM via the mock provider
```

Pick the right one for the question you're answering. Pair this skill with
`/e2e-testing` (which covers the shared-page pattern, the `data-test` contract,
and the general support helpers).

## When to use which

**`tools/` — call one tool directly.** Use this when you're testing what a
single tool produces, given known inputs and a known page state. No LLM
involved, no WebSocket, no scripting. Asserts the tool's return shape and any
side effects on the page state.

```ts
import { runAgentTool } from '../../../support/agent'

const result = await runAgentTool(page, 'get_page_text', {})
expect(result.text).toMatchInlineSnapshot(...)
```

`runAgentTool` calls into `window.__BLOKKLI__.test.runAgentTool(name, params)` —
registered by the playground's `test-cases` feature. The sidebar must be opened
first with `openSidebar(page, 'test-cases')` for the global to exist.

**`mock-scripts/` — exercise the whole loop.** Use this when you're testing that
the conversation flow works end to end — UI state transitions on submit, tool
calls firing from an LLM response, multi-turn behaviour, error paths. The mock
LLM provider replays a scripted sequence of agent turns; real tools fire for
real and produce real tool relays.

```ts
import {
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

const script: MockScript = [
  { type: 'user', content: 'hello' },
  { type: 'agent', content: [{ type: 'text', text: 'Hi! How can I help?' }] },
]
await setAgentMockScript(page, script)
await openAgentPanel(page)
await submitAgentPrompt(page, 'hello')
await waitForAgentReply(page, 'Hi! How can I help?')
```

## The mock-script grammar

`MockScript` is **the same JSON shape as the "Copy conversation JSON" action**
in the Transcript panel. To reproduce a bug from a real conversation, copy the
transcript and paste it verbatim — no translation needed.

```ts
type MockScript = Array<{
  type: 'user' | 'agent'
  content: string | GenericContentBlock[]
}>
```

The mock provider **ignores user entries** at replay time. They serve only as
readable scaffolding so a pasted transcript stays self-documenting. The mock
plays the `agent` entries in order — one per LLM turn. Turn index is derived
from the assistant-message count in the live history, so the implementation is
stateless across reconnects.

### How a script maps to behaviour

Each `agent` entry becomes one streamed turn:

- A `text` block → `text_start` → `text_delta` → `text_end`.
- A `tool_use` block → `tool_use_start` →
  `tool_use_delta(JSON.stringify(input))` → `tool_use_end`. The client then
  executes the tool for real; its real result flows back to the server as a real
  tool relay.
- An entry with `toolUses` ends with `stop_reason: 'tool_use'`; text-only ends
  with `end_turn`. Session's loop continues iff any tool was called.

When the script runs out of agent entries, the mock yields a single `end_turn`
and the conversation stops.

### Multi-turn example (with a real tool call)

```ts
const script: MockScript = [
  { type: 'user', content: 'find Drupal' },
  {
    type: 'agent',
    content: [
      { type: 'text', text: 'Searching…' },
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'search_text',
        input: { query: 'Drupal', limit: 20 },
      },
    ],
  },
  // The tool_result on the user side is purely informative — the real tool
  // runs at replay time and produces the real relay. Including it here lets a
  // future maintainer paste the full transcript verbatim.
  {
    type: 'user',
    content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '...' }],
  },
  { type: 'agent', content: [{ type: 'text', text: 'Found 6 matches.' }] },
]
```

The first `agent` turn streams text + fires `search_text` against the live page.
After the real tool relay lands, the mock plays the second `agent` turn.

## How the opt-in works (architecture)

- **Module config**: `enableMock?: boolean` in `AgentModuleOptions`. The
  playground sets it to `true`; production builds leave it off (default).
- **Build templates** emit `export const enableMock` for both the server
  (`agent-server`) and the client (`agent-client`). When off,
  `createMockProvider` isn't imported.
- **Client**: `agentProvider.sendInit()` reads
  `window.__BLOKKLI_AGENT_MOCK_SCRIPT__` and attaches it as `mockScript` on the
  `init` WebSocket message — only when `enableMock` is true at build time.
- **Server**: the WS handler calls `session.useMockProvider(script)` only when
  `enableMock && data.mockScript`. The session's provider is swapped for that
  connection; the configured provider (Anthropic/OpenAI) is untouched.
- **`start` precondition**: the apiKey check is skipped when
  `enableMock && session.isMocked` (defense in depth — both must agree). Mock
  tests run without `NUXT_BLOKKLI_AGENT_API_KEY` set.

`?testing=true` is unrelated to the mock — it gates the adapter recorder.
Mock-script tests don't depend on it.

## Support helpers (`test/e2e/support/agent.ts`)

| Helper                                     | What it does                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `runAgentTool(page, name, params)`         | Invoke one tool client-side (no LLM). Returns the tool's `result`. Requires `openSidebar(page, 'test-cases')`. |
| `setAgentMockScript(page, script)`         | Install a script on the window. **Must be called before `openAgentPanel`** — read once during `sendInit`.      |
| `openAgentPanel(page)`                     | Open the agent sidebar and clear any auto-restored conversation. Idempotent.                                   |
| `submitAgentPrompt(page, prompt)`          | Fill the input and click submit.                                                                               |
| `waitForAgentReply(page, contains, opts?)` | Poll the most recent assistant bubble until its text contains `contains`. Default 10s timeout.                 |

## `data-test` hooks on the agent UI

Add new ones following `data-test="agent-<thing>"`:

| Selector                                | Element                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `[data-test="agent-input"]`             | Input wrapper (use `... textarea` to reach the textarea).                      |
| `[data-test="agent-submit"]`            | The send button.                                                               |
| `[data-test="agent-new-conversation"]`  | "Start new conversation" button — only visible when `hasConversation` is true. |
| `[data-test="agent-assistant-message"]` | Each assistant message bubble. Use `.last()` to grab the most recent.          |

## Common patterns

### Reproducing a bug from a transcript

1. In the running app, hit "Copy conversation JSON" on the Transcript panel.
2. Paste the snapshot verbatim into a test file as
   `const script: MockScript = [...]`.
3. Write the test calling `setAgentMockScript` + `openAgentPanel` +
   `submitAgentPrompt` with the original first user prompt + assertions.

No transformation step. The snapshot **is** the script.

### Why clear auto-restored conversations

The playground persists conversations server-side. On panel re-open the prior
session is auto-restored, so the mock's turn index (derived from the
assistant-message count) won't be `0`. `openAgentPanel` clicks
`agent-new-conversation` if it's visible. Without that, the mock would play turn
N+M instead of turn N, and your script would silently misalign.

### Authenticated state in mock mode

The mock-driven `start` path doesn't need a real API key. Tests run with
`NUXT_BLOKKLI_AGENT_API_KEY` unset. The HMAC handshake on `authenticate` is
still real, so auth code stays exercised in tests.

### What's intentionally out of scope (today)

- **Branching scripts** based on user input. The replay is linear — if you need
  different agent responses for different inputs, write two tests.
- **Project-authored scripts via module config**. Scripts live inline in test
  files; there's no `defineBlokkliAgentMockScript()` (yet).
- **Error injection / partial-stream pacing / reasoning blocks**. Add when
  needed; the StreamEvent union has the slots.
- **Auth bypass**. Tests still run the real HMAC handshake — deliberately, so
  auth regressions surface here.

## Quick reference

```ts
// tools/ pattern
import { runAgentTool } from '../../../support/agent'
const result = await runAgentTool(page, 'tool_name', { ...params })

// mock-scripts/ pattern
import {
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

await setAgentMockScript(page, script)
await openAgentPanel(page)
await submitAgentPrompt(page, 'user prompt')
await waitForAgentReply(page, 'expected substring')
```

For Playwright lifecycle (`setupEditorE2E`, `openEditor`, shared-page rules, the
`data-test` contract, `withApp`), see `/e2e-testing`. For agent module internals
(WebSocket protocol, tool system, providers, Session loop), see `/agent`.
