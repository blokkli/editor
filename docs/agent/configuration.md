# Configuration

The agent module is configured via the `agentModule()` call in your
`nuxt.config.ts` and environment variables at runtime.

## Module Options

```ts
import agentModule from '@blokkli/editor/agent'

agentModule({
  provider: 'anthropic',
  models: [/* ... */],
  allowedFetchOrigins: ['https://example.com'],
  defaultPrompts: ['Translate all content to German'],
  debugPrompt: false,
})
```

### `provider`

**Required.** The AI provider to use.

| Value | Description |
|-------|-------------|
| `'anthropic'` | Anthropic's Claude models. Uses explicit cache breakpoints for prompt caching. |
| `'openai'` | OpenAI's GPT models. Uses automatic prefix caching. Requires the `openai` npm package. |

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

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Model identifier passed to the provider API (e.g. `'claude-haiku-4-5'`) |
| `label` | `string` | Human-readable name shown in the UI |
| `isDefault` | `boolean?` | Whether this is the default model. First model is used if none is marked. |
| `pricing` | `object?` | Per-million-token costs. When set, the UI shows estimated costs per turn. |

The `pricing` object:

| Property | Description |
|----------|-------------|
| `input` | Cost per 1M input tokens |
| `cacheWrite` | Cost per 1M tokens written to cache |
| `cacheRead` | Cost per 1M tokens read from cache |
| `output` | Cost per 1M output tokens |

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

### `debugPrompt`

When `true` (and only in dev mode), the system prompt allows asking about
internals like available tools, the system prompt itself, etc. Useful during
development.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NUXT_BLOKKLI_AGENT_API_KEY` | API key for the LLM provider (Anthropic or OpenAI) |
| `NUXT_BLOKKLI_AGENT_AUTH_SECRET` | Secret used for HMAC signing of WebSocket auth tokens |

Both are set via Nuxt runtime config under `runtimeConfig.blokkli.agent`.

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
