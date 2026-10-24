# Quick Start

This guide walks you through the minimal setup to get the blökkli agent running.

## Prerequisites

- A Nuxt app with blökkli installed
- An API key from [Anthropic](https://console.anthropic.com/) or
  [OpenAI](https://platform.openai.com/)

## Step 1: Enable WebSocket Support

The agent requires Nitro's experimental WebSocket support:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    experimental: {
      websocket: true,
    },
  },
})
```

## Step 2: Add the Agent Module

Import and configure the agent module in your blökkli config:

```ts
// nuxt.config.ts
import agentModule from '@blokkli/editor/agent'

export default defineNuxtConfig({
  nitro: {
    experimental: {
      websocket: true,
    },
  },

  blokkli: {
    modules: [
      agentModule({
        provider: 'anthropic',
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
        ],
        defaultPrompts: [
          'Rewrite the page title and lead text',
          'Translate all content to German',
        ],
      }),
    ],
  },
})
```

## Step 3: Set Environment Variables

The agent needs an API key for the LLM provider and a secret for WebSocket
authentication:

```bash
# .env
NUXT_BLOKKLI_AGENT_API_KEY=sk-ant-...    # Your Anthropic or OpenAI API key
NUXT_BLOKKLI_AGENT_AUTH_SECRET=my-secret  # Any random string for HMAC signing
```

The backend signs the agent's tokens with the same secret (step 4). Keep both
out of version control.

The provider's SDK is a peer dependency: install `@anthropic-ai/sdk` (or
`openai`) in your Nuxt app.

## Step 4: Set Up the Adapter

The agent requires the adapter to provide an authentication token and the
`use_agent` permission. The setup depends on which adapter you use.

### Drupal Adapter

The Drupal adapter handles everything automatically when the backend module is
enabled:

1. **Enable the Drupal submodule** — install and enable the
   `paragraphs_blokkli_agent` module in your Drupal site
2. **Enable the GraphQL extension** — add the "Paragraphs Blökkli Agent"
   extension to your GraphQL server configuration
3. **Set the secret** — in `settings.php`, from the same environment variable as
   Nuxt's, never in exported config:

   ```php
   $config['paragraphs_blokkli_agent.settings']['auth_secret'] = getenv('NUXT_BLOKKLI_AGENT_AUTH_SECRET') ?: '';
   ```

   Without a secret, Drupal makes no tokens and the editor hides the agent. A
   site can turn the agent off on some of its instances this way.

4. **Grant permission** — assign the "Use blökkli AI agent" permission
   (`use paragraphs blokkli agent`) to the appropriate Drupal roles

Once the GraphQL schema exposes the `paragraphsBlokkliAgentToken` mutation, the
Drupal adapter automatically registers `getAgentAuthToken()` and
`agentConversations`. No adapter code changes are needed. `swapBlocks()` and
`rearrangeBlocks()` come with their own mutations (`pbSwapParagraphs`,
`pbRearrangeParagraphs`) of the main GraphQL extension.

### Custom Adapter

If you're using a custom adapter, you need to implement the token endpoint and
adapter method yourself. See the [Adapter](/modules/agent/adapter) page for full
details.

In short:

1. Create a server route that generates HMAC tokens for authenticated users
2. Implement `getAgentAuthToken()` in your adapter to fetch from that endpoint
3. Return `'use_agent'` from your adapter's `getPermissions()` method

## Step 5: Pass the WebSocket Through

If a web server (nginx, Traefik, …) sits in front of Nuxt, it must pass
`/api/blokkli/agent` and the paths below it to Nuxt with the WebSocket upgrade
headers (`Upgrade`, `Connection: upgrade`, HTTP/1.1) and long read and send
timeouts. A Content-Security-Policy needs the WebSocket in `connect-src`
(`'self'` covers the same origin; see
[Security](/security#content-security-policy)), and basic auth in front of the
site must let these paths through.

## Step 6: Start Chatting

Start your dev server and open the editor. You'll see a new chat icon in the
toolbar. Click it to open the agent sidebar and start chatting.

## Next Steps

- [Configuration](/modules/agent/configuration) — all options and environment
  variables
- [Adapter Methods](/modules/agent/adapter) — full reference for adapter
  integration
- [Custom Tools](/modules/agent/custom-tools) — add project-specific tools
