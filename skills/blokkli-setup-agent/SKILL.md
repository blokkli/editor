---
name: blokkli-setup-agent
description: >-
  Set up blökkli's AI agent in a blökkli 2.x + Drupal project: the Drupal module
  and its secret, the Nuxt module with its models and API key, the WebSocket
  through the web server, and the project's own skills, tools and prompts. Use
  when editors should edit pages with the agent, when the agent's button is
  missing, when the agent says it's unauthorized or can't connect, or when a
  project's skill, tool or prompt doesn't show up.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal and agent modules and
  paragraphs_blokkli 2.x, an API key from Anthropic or OpenAI, plus access to
  the Drupal backend (drush, config export, settings.php), the Nuxt project and
  the web server's config.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/agent/overview
---

# The AI agent

blökkli's agent module adds a chat to the editor. The agent reads the page and
changes it through the same adapter as the editor, so Drupal checks every change
against the user's permissions. The browser talks to the agent over a WebSocket
on the Nuxt server, which calls the model with the API key. Drupal signs a
short-lived token that lets the browser in.

The docs: [quick start](https://docs.blokk.li/modules/agent/quick-start),
[configuration](https://docs.blokk.li/modules/agent/configuration),
[custom tools](https://docs.blokk.li/modules/agent/custom-tools),
[custom skills](https://docs.blokk.li/modules/agent/custom-skills),
[custom prompts](https://docs.blokk.li/modules/agent/custom-prompts). This skill
is the procedure and the traps.

## 1. Drupal

```bash
drush en paragraphs_blokkli_agent
```

- **GraphQL:** enable the extension `paragraphs_blokkli_agent` on the server
  (`schema_configuration.core_composable.extensions`). It adds the token
  mutation `paragraphsBlokkliAgentToken` and the saved conversations.
- **The secret** comes from the environment, in `settings.php`:

  ```php
  $config['paragraphs_blokkli_agent.settings']['auth_secret'] = getenv('NUXT_BLOKKLI_AGENT_AUTH_SECRET') ?: '';
  ```

  - Never put it in exported config: `drush cex` should keep writing
    `auth_secret: ''`.
  - Don't use the module's settings form (`/admin/config/content/blokkli/agent`)
    for it: the form stores the secret in config.
  - Without a secret, the token mutation throws.

- **Permissions:** tell the developer who needs which; don't assign them
  yourself.
  - `use paragraphs blokkli agent` ("Use blökkli AI agent"): everyone who should
    use the agent. It only opens the chat. Every change is still checked against
    the user's other permissions, so the agent can't do more than its user.
  - `manage all blokkli agent conversations`: see and delete other users'
    conversations. Admins.
  - `administer blokkli agent conversations`: the conversations' admin pages.
    Admins.

## 2. Nuxt

```ts
// nuxt.config.ts
import drupal from '@blokkli/editor/drupal'
import agent from '@blokkli/editor/agent'

export default defineNuxtConfig({
  nitro: { experimental: { websocket: true } },
  blokkli: {
    modules: [
      drupal(),
      agent({
        provider: 'anthropic',
        models: [
          {
            name: 'claude-haiku-4-5',
            label: 'Claude Haiku 4.5',
            routing: true,
            pricing: { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 },
          },
          {
            name: 'claude-sonnet-5-5',
            label: 'Claude Sonnet 5.5',
            isDefault: true,
            pricing: { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 },
          },
        ],
      }),
    ],
  },
})
```

- **The provider's SDK** is a peer dependency: install `@anthropic-ai/sdk` (or
  `openai`).
- **WebSockets:** the module throws without `nitro.experimental.websocket`.
- **Models:**
  - The default model (`isDefault`) runs the conversation.
  - The routing model (`routing: true`) picks the skills and tools before the
    first message, so a small one is enough.
  - The prices (USD per million tokens, from the provider's pricing page) show
    the cost of each turn.
- **The environment:**

  ```bash
  NUXT_BLOKKLI_AGENT_API_KEY=…      # the provider's key
  NUXT_BLOKKLI_AGENT_AUTH_SECRET=…  # the same value as Drupal's auth_secret
  ```

  - **The secret:** a long random string, e.g. `openssl rand -hex 32`.
  - **The key:** give it a spend limit at the provider. Every editor's
    conversation runs on it.

- **Other options:**
  - `defaultPrompts`: suggestions on the welcome screen, in one language
    (section 4 has translated ones);
  - `agentName`;
  - `allowedFetchOrigins`: the origins the `web_fetch` tool may read; without
    it, the tool can't fetch;
  - `routes`.
- **`enableMock` is only for end-to-end tests.** It lets any client replay a
  script without the key. Keep it out of production builds.
- **The adapter:** nothing to add. Once the schema has the mutation, the Drupal
  adapter fetches the token (`getAgentAuthToken`) and saves the conversations.

## 3. The web server

The browser reaches the agent at `/api/blokkli/agent` (the WebSocket) and the
paths below it (`/stream`, `/route`, `/fetch`).

- **Proxy them to Nuxt** with the upgrade headers and long timeouts. In nginx:

  ```nginx
  location ^~ /api/blokkli/agent {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 1d;
    proxy_send_timeout 1d;
    proxy_pass http://127.0.0.1:3000;
  }
  ```

  If Drupal answers other `/api` paths, this location must win (`^~`).

- **Custom `routes`** fall out of this location: proxy them too.
- **A Content-Security-Policy:** `connect-src 'self'` covers a same-origin
  WebSocket.
- **Basic auth** in front of a staging site: if the chat can't connect there,
  exempt these paths.

## 4. The project's own skills, tools and prompts

They go in `blokkli/` in the Nuxt app's root directory, next to
`nuxt.config.ts`, **not** in `app/`. They're found at build time.

| Folder                    | Runs in | Defined with                     | For                                                    |
| ------------------------- | ------- | -------------------------------- | ------------------------------------------------------ |
| `blokkli/skills/`         | server  | `defineBlokkliAgentSkill`        | the project's rules: how pages are built, style guides |
| `blokkli/tools/`          | browser | `defineBlokkliAgentTool`         | the project's data and actions                         |
| `blokkli/prompts/`        | browser | `defineBlokkliAgentPrompt`       | ready-made prompts on the welcome screen and in menus  |
| `blokkli/system-prompts/` | server  | `defineBlokkliAgentSystemPrompt` | rules for every message (prefer skills)                |

**Names are string literals.** Tool and skill names are read at build time for
the generated types. A file whose name is computed is left out, with a warning
in the build log.

**Skills** are loaded on demand: by the agent, by routing, or by a prompt.

```ts
// blokkli/skills/style.ts
import { defineBlokkliAgentSkill } from '#blokkli/agent/server/skills'

export default defineBlokkliAgentSkill({
  name: 'style-guide',
  label: { en: 'Style guide', de: 'Schreibregeln', fr: 'Règles de rédaction' },
  description:
    'The writing rules of the site. Load it before you write, check or translate texts.',
  streamTemplates: [
    'rewrite',
    'generate_content',
    'fix_readability',
    'translate',
  ],
  getContents: () => `# Style guide\n\n- …`,
})
```

- **Write what the agent can't know:** how the project's pages are built, which
  paragraph type to use for what, where facts come from. The paragraph types'
  fields and descriptions are already in its prompt.
- **`tools`:** lazy tools that load with the skill.
- **`streamTemplates`:** the content also goes to the separate requests that
  rewrite, write and translate texts. It goes to every such request, loaded or
  not, and replaces their default instructions (e.g. "keep the tone"), so say
  what still applies.

**Tools** run in the browser, with the editor's app (`ctx.app`) and the adapter.
A `$fetch` to the app's own server routes carries the user's session.

```ts
// blokkli/tools/get_fees/index.ts
import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

export const paramsSchema = z.object({ topic: z.enum(['water', 'waste']) })
export const resultSchema = z.object({ fees: z.record(z.string(), z.number()) })

export default defineBlokkliAgentTool({
  name: 'get_fees',
  description: 'Get the official fees. Never invent fees.',
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) => $t('myProjectGetFees', 'Getting the fees'),
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const { $t } = ctx.app
    const fees = await $fetch<Record<string, number>>(
      `/api/fees/${params.topic}`,
    )
    return {
      label: $t('myProjectGetFeesDone', 'Got the fees'),
      result: { fees },
    }
  },
})
```

- **Export the schemas:** the generated types read them, so that prompts can run
  the tool typed (`runTool`).
- **`lazy: true`** keeps the tool out of the prompt until the agent, a skill or
  a prompt loads it.
- **`category: 'mutation'`** tools return an `apply(adapter)` and need the
  user's approval: see the custom tools docs.

**Prompts** appear on the welcome screen (`contexts: ['welcome']`) or in a
paragraph's menu (`'item'`):

```ts
// blokkli/prompts/styleGuide.ts
import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentPrompt({
  id: 'my_project_style_guide',
  contexts: ['item', 'welcome'],
  skills: ['style-guide'],
  tools: ['get_page_text', 'delegate_text_rewrite'],
  getLabel: ({ $t }) => $t('myProjectStyleGuide', 'Check the style guide'),
  getPrompt: ({ $t }) =>
    $t(
      'myProjectStyleGuidePrompt',
      'Check the texts of this page against the style guide.',
    ),
})
```

- **The prompt is what an editor could have typed, in their language.** The
  agent answers in the language of the first message, so an English instruction
  gets English answers. Put the instructions in a skill the prompt loads.
- **Only where it applies:** `defineBlokkliAgentPrompt({ resolve: (app) => … })`
  returns `[]` elsewhere, e.g. on hosts without a certain field.
- **Translations:** `$t(key, english)`, with the other languages in blökkli's
  `translations` option in `nuxt.config.ts`. Skill labels take `{ en, de, fr }`.

## 5. Check it

1. The schema has `paragraphsBlokkliAgentToken`, and Nuxt doesn't list `agent`
   in its "Features disabled because the Drupal GraphQL schema lacks support for
   them" log line. Without that line, check that the mutation is in the schema
   file the frontend uses.
2. `.nuxt/blokkli/agent-server.js` imports the project's skills and tools.
3. As a user with the permission, open the editor: the agent's button is in the
   toolbar. A user without it doesn't see it.
4. Open the chat. In the browser's developer tools, the WebSocket to
   `/api/blokkli/agent` stays open. Ask something: an answer arrives.
5. The project's prompts are on the welcome screen, in every language.
6. Ask for a change the user's role doesn't allow: Drupal refuses it.

## Traps, by symptom

- **No agent button:** the user lacks `use paragraphs blokkli agent`, or the
  schema lacks the token mutation (section 1).
- **Drupal throws when the chat opens:** the secret is empty (section 1).
- **"Unauthorized":**
  - The two secrets differ (sections 1, 2).
  - The clocks are more than 5 minutes apart: tokens expire after 300 seconds.
  - A token was used twice. Two tokens made in the same second are the same
    token, so a second connection in that second is rejected: try again.
- **The chat can't connect:** the web server doesn't pass the WebSocket through,
  or the CSP blocks it (section 3).
- **A typed message fails, and only scripts work:** no API key (section 2).
- **A skill, tool or prompt is missing:**
  - It's in `app/blokkli/` instead of `blokkli/` (section 4).
  - Its name isn't a string literal (section 4).
  - The dev server hasn't picked up a new file: restart it.
- **The agent answers in English after a prompt:** the prompt's text is English
  (section 4).
- **`web_fetch` fails:** no `allowedFetchOrigins` (section 2).
- **The permission reaches no role:** `drush role:perm:add` takes one role (and
  a comma-separated list of permissions). With several roles separated by
  commas, it reports success and changes nothing.
