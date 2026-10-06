# Configuration

The agent module is configured via the `agentModule()` call in your
`nuxt.config.ts` and environment variables at runtime.

## Module Options

```ts
import agentModule from '@blokkli/editor/agent'

agentModule({
  provider: 'anthropic',
  models: [
    /* ... */
  ],
  allowedFetchOrigins: ['https://example.com'],
  defaultPrompts: ['Translate all content to German'],
  debugPrompt: false,
})
```

### `provider`

**Required.** The AI provider to use.

| Value         | Description                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `'anthropic'` | Anthropic's Claude models. Uses explicit cache breakpoints for prompt caching. Requires the `@anthropic-ai/sdk` npm package. |
| `'openai'`    | OpenAI's GPT models. Uses automatic prefix caching. Requires the `openai` npm package.                                       |

### `models`

**Required.** Array of available models. At least one model must be defined.

```ts
models: [
  {
    name: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    isDefault: true,
    pricing: {
      input: 1,
      cacheWrite: 1.25,
      cacheRead: 0.1,
      output: 5,
    },
  },
  {
    name: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    pricing: {
      input: 3,
      cacheWrite: 3.75,
      cacheRead: 0.3,
      output: 15,
    },
  },
]
```

Each model has:

| Property    | Type       | Description                                                               |
| ----------- | ---------- | ------------------------------------------------------------------------- |
| `name`      | `string`   | Model identifier passed to the provider API (e.g. `'claude-haiku-4-5'`)   |
| `label`     | `string`   | Human-readable name shown in the UI                                       |
| `isDefault` | `boolean?` | Whether this is the default model. First model is used if none is marked. |
| `routing`   | `boolean?` | The model for routing (see below). Defaults to the default model.         |
| `pricing`   | `object?`  | Per-million-token costs. When set, the UI shows estimated costs per turn. |

**Routing:** before the first message of a conversation, the routing model reads
the prompt and picks the skills and lazy tools to load, so the main model starts
with them. A small, fast model is enough, e.g. Claude Haiku next to a larger
default model.

The `pricing` object:

| Property     | Description                         |
| ------------ | ----------------------------------- |
| `input`      | Cost per 1M input tokens            |
| `cacheWrite` | Cost per 1M tokens written to cache |
| `cacheRead`  | Cost per 1M tokens read from cache  |
| `output`     | Cost per 1M output tokens           |

### `allowedFetchOrigins`

Optional array of allowed origins for the `web_fetch` tool. When set, the agent
can only fetch URLs from these origins.

```ts
allowedFetchOrigins: ['https://example.com', 'https://docs.example.com']
```

### `defaultPrompts`

Optional array of prompt suggestions shown in the welcome screen as clickable
buttons.

```ts
defaultPrompts: [
  'Rewrite the page title and lead text',
  'Add a new text block with a summary',
  'Move the last section to the top',
  'Translate all content to German',
]
```

### `agentName`

The agent's name, as shown to the user. Defaults to `'Superblökkli'`.

### `routes`

The paths of the agent's server routes. Change them only if they clash with your
app's routes.

| Route     | Default                     | What                                     |
| --------- | --------------------------- | ---------------------------------------- |
| `agent`   | `/api/blokkli/agent`        | The WebSocket                            |
| `stream`  | `/api/blokkli/agent/stream` | Streamed rewrites and translations (SSE) |
| `routing` | `/api/blokkli/agent/route`  | Routing before the first message         |
| `fetch`   | `/api/blokkli/agent/fetch`  | The `web_fetch` tool                     |

A web server in front of Nuxt must pass all of them through, the WebSocket with
its upgrade headers and long timeouts. Under the defaults, one rule for
`/api/blokkli/agent` covers them all.

### `enableMock`

For end-to-end tests: when `true`, a client can send a script of the agent's
replies when it connects, and the server replays it instead of calling the
model. Such conversations need no API key. Never enable it in production.

### `debugPrompt`

When `true` (and only in dev mode), the system prompt allows asking about
internals like available tools, the system prompt itself, etc. Useful during
development.

## Environment Variables

| Variable                         | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| `NUXT_BLOKKLI_AGENT_API_KEY`     | API key for the LLM provider (Anthropic or OpenAI)    |
| `NUXT_BLOKKLI_AGENT_AUTH_SECRET` | Secret used for HMAC signing of WebSocket auth tokens |

Both are set via Nuxt runtime config under `runtimeConfig.blokkli.agent`. The
backend signs the tokens with the same secret: with the Drupal adapter,
`paragraphs_blokkli_agent`'s `auth_secret` (see
[Quick Start](/modules/agent/quick-start)).

## Example: OpenAI Configuration

```ts
agentModule({
  provider: 'openai',
  models: [
    {
      name: 'gpt-5-mini',
      label: 'GPT-5 Mini',
      isDefault: true,
      pricing: {
        input: 0.25,
        cacheWrite: 0.25,
        cacheRead: 0.025,
        output: 2,
      },
    },
  ],
})
```

```bash
NUXT_BLOKKLI_AGENT_API_KEY=sk-...
NUXT_BLOKKLI_AGENT_AUTH_SECRET=my-secret
```
