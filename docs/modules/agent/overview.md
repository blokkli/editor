# Agent Overview

The blökkli agent module adds an AI assistant directly into the editor. It
appears as a sidebar panel where users can chat with an LLM to read, create,
edit, move, and delete blocks — all through natural language.

## Key Capabilities

- **Read page content** — query blocks, text, media, and structure
- **Add blocks** — create new blocks with text, nested children, and options
- **Edit content** — batch rewrite text across multiple blocks at once
- **Move & rearrange** — move, swap, and reorder blocks
- **Delete blocks** — remove one or many blocks
- **Plans** — break complex tasks into multi-step plans with user approval
- **Skills** — load domain-specific knowledge on demand (style guides, brand
  rules, etc.)

## How It Works

The agent connects to the server over a WebSocket. When the user sends a
message, the server streams the LLM response back in real time. The LLM has
access to a set of **tools** (inspired by MCP) that let it interact with the
page.

```
┌─────────────┐    WebSocket   ┌────────────┐    API     ┌──────────┐
│   Browser   │ ◄────────────► │   Nitro    │ ◄────────► │ LLM API  │
│  (Vue app)  │   tool calls   │  (server)  │ streaming  │(Anthropic│
│             │   + results    │            │            │ /OpenAI) │
└─────────────┘                └────────────┘            └──────────┘
```

1. The client sends page context and tool definitions on connect
2. The user types a message
3. The server forwards it to the LLM provider with the system prompt
4. The LLM streams text and tool calls back
5. Tool calls are executed client-side (where the editor state lives)
6. Results are sent back to continue the conversation

## Supported Providers

| Provider  | Models                       | Prompt Caching             |
| --------- | ---------------------------- | -------------------------- |
| Anthropic | Claude (Haiku, Sonnet, Opus) | Explicit cache breakpoints |
| OpenAI    | GPT models                   | Automatic prefix caching   |

## Extensibility

The agent is designed to be customized for your project:

- [**Custom Tools**](/modules/agent/custom-tools) — add project-specific query and
  mutation tools
- [**Custom Skills**](/modules/agent/custom-skills) — provide domain knowledge the LLM
  can load on demand
- [**Custom Prompts**](/modules/agent/custom-prompts) — add quick-action suggestions and
  system prompt sections

## Next Steps

- [Quick Start](/modules/agent/quick-start) — get the agent running in your project
- [Configuration](/modules/agent/configuration) — all module options and environment
  variables
- [Architecture](/modules/agent/architecture) — WebSocket protocol, plans, caching, and
  built-in tools
