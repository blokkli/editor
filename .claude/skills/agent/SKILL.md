---
description:
  Reference for the blökkli agent module — AI assistant integrated into the
  editor via WebSocket, MCP-style tools, and streaming LLM providers
---

# Agent Module Skill

The agent module (`src/modules/agent/`) adds an AI assistant to the blökkli
editor. It runs as a sidebar feature where users chat with an LLM that can
query and mutate page content through a tool system.

## Module Structure

```
src/modules/agent/
├── index.ts                    # Module entry: registers feature, aliases, server handlers
├── build/                      # AgentCollector + code generation templates
├── runtime/
│   ├── app/                    # Client-side code
│   │   ├── composables/        # agentProvider, defineBlokkliAgentTool/Prompt
│   │   ├── features/agent/     # Main feature UI (sidebar panel)
│   │   ├── helpers/            # Tool resolution, execution, schema generation
│   │   ├── tools/              # Built-in MCP tools
│   │   └── types/              # Tool, conversation, prompt types
│   ├── server/                 # Server-side code
│   │   ├── agent.ts            # WebSocket handler entry point
│   │   ├── Session.ts          # Conversation state, agent loop, tool orchestration
│   │   ├── SessionManager.ts   # Per-peer session management, auth
│   │   ├── providers/          # LLM providers (anthropic, openai)
│   │   ├── default-system-prompts/  # Modular system prompt sections
│   │   ├── default-skills/     # Built-in skills (loaded on demand)
│   │   └── helpers.ts          # Message pruning, hashing, error classification
│   └── shared/                 # WebSocket protocol types, page context, plan state
└── css/                        # Agent UI styles (partials in css/partials/)
```

## Configuration

```typescript
// nuxt.config.ts
blokkli: {
  modules: {
    agent: {
      provider: 'anthropic' | 'openai',  // Required
      model: string,                      // Required
      allowedFetchOrigins?: string[],     // Whitelist for web_fetch tool
      debugPrompt?: boolean,              // Dev: allow asking about internals
      defaultPrompts?: string[],          // Welcome screen suggestions
    }
  }
}

// Environment variables
NUXT_BLOKKLI_AGENT_API_KEY      // LLM provider API key
NUXT_BLOKKLI_AGENT_AUTH_SECRET  // HMAC secret for WebSocket auth
```

## Communication Flow

1. Client opens WebSocket to `/api/blokkli/agent`
2. Client authenticates with HMAC token (from adapter's `getAgentAuthToken()`)
3. Client sends page context + available tools (JSON schemas)
4. User sends a message → server streams LLM response
5. LLM can call tools → server sends `tool_call` → client executes → sends
   `tool_result` → loop continues until final text response

## Tool System

Tools use an MCP-inspired pattern with Zod schemas for parameters.

- **Query tools** (`category: 'query'`): Read-only, execute immediately
- **Mutation tools** (`category: 'mutation'`): Require user approval
- **Lazy tools**: Loaded on demand via `load_skill` to keep context small
- **Interactive tools**: Render Vue components for user interaction (e.g., diff
  UI for batch rewrites)
- **Tool factories**: Generate tools dynamically from runtime context

Built-in tools are in `runtime/app/tools/`. Projects can add custom tools in
`blokkli/tools/*.ts` using `defineBlokkliAgentTool()`.

## Plan System

For complex tasks, the agent creates multi-step plans with labeled steps. The
user approves or rejects the plan before execution. State is managed in
`Session.ts` and shown via the Plan UI component.

## System Prompts

Assembled from weighted sections in `runtime/server/default-system-prompts/`.
Sections cover agent role, workflow rules, tool descriptions, page architecture,
available bundles, interaction rules, and security constraints.

Projects can add custom sections in `blokkli/system-prompts/*.ts` using
`defineBlokkliAgentSystemPrompt()`.

## Skills (Server-Side)

On-demand knowledge blocks the LLM loads via a `load_skill` server tool. Keeps
the base prompt lean. Built-in skills are in `runtime/server/default-skills/`.

Projects can add custom skills in `blokkli/skills/*.ts` using
`defineBlokkliAgentSkill()`.

## Agent Prompts (Client-Side)

Predefined prompts shown as suggestions in the welcome screen. Projects can add
them in `blokkli/prompts/*.ts` using `defineBlokkliAgentPrompt()`.

## Conversation Persistence

Conversations are persisted via adapter methods (`agentConversations.upsert`,
`load`, `loadLatest`, `list`, `delete`). State snapshots include a hash for
tamper detection, and items are validated with Zod schemas on restore.

## Adapter Extensions

The module extends the blökkli adapter with:

- `swapBlocks(first, second)` — Swap two blocks
- `getAgentAuthToken()` — Get HMAC auth token for WebSocket
- `agentConversations` — Conversation CRUD operations
