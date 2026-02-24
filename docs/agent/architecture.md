# Architecture

This page covers the agent's internal architecture: the WebSocket protocol,
session lifecycle, plan system, message management, and a reference of all
built-in tools and skills.

## WebSocket Protocol

The agent uses a single WebSocket connection per session. Messages are JSON
objects with a `type` field.

### Connection Flow

```
Client                          Server
  │                               │
  │──── authenticate ────────────►│  Send HMAC token
  │◄─── authenticated ───────────│  Token validated
  │                               │
  │──── init ────────────────────►│  Send tools + page context
  │                               │
  │──── start ───────────────────►│  Send user message
  │◄─── text_delta ──────────────│  Streaming LLM response
  │◄─── text_delta ──────────────│
  │◄─── tool_call ───────────────│  LLM requests tool execution
  │                               │
  │──── tool_result ─────────────►│  Client sends tool result
  │◄─── text_delta ──────────────│  LLM continues
  │◄─── done ────────────────────│  Turn complete
  │◄─── usage ───────────────────│  Token usage for this turn
  │◄─── conversation_state ──────│  State snapshot for persistence
```

### Client Messages

| Type                           | Description                                |
| ------------------------------ | ------------------------------------------ |
| `authenticate`                 | Send auth token to validate the connection |
| `init`                         | Send tool definitions and page context     |
| `start`                        | Send a user message to start a turn        |
| `tool_result`                  | Return the result of a tool call           |
| `cancel`                       | Cancel the current turn                    |
| `accept` / `reject`            | Approve or reject a pending mutation       |
| `plan_approve` / `plan_reject` | Approve or reject a proposed plan          |
| `new_conversation`             | Reset the conversation                     |
| `restore_conversation`         | Restore a persisted conversation           |
| `get_transcript`               | Request the raw conversation transcript    |
| `ping`                         | Keep-alive ping                            |

### Server Messages

| Type                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `authenticated`               | Auth token accepted                          |
| `text`                        | Complete text block                          |
| `text_delta`                  | Streaming text chunk                         |
| `tool_call`                   | Request tool execution from the client       |
| `server_tool_result`          | Result of a server-side tool (skills, plans) |
| `done`                        | Turn complete                                |
| `error`                       | Error with classified type                   |
| `plan_update`                 | Plan state changed                           |
| `usage`                       | Token usage for the completed turn           |
| `conversation_state`          | State snapshot for persistence               |
| `conversation_restored`       | Conversation successfully restored           |
| `conversation_restore_failed` | Restore failed (hash mismatch, etc.)         |
| `transcript`                  | Raw conversation transcript                  |

## Session Lifecycle

1. **Connect** — client opens WebSocket to `/api/blokkli/agent`
2. **Authenticate** — client sends HMAC token, server validates it
3. **Initialize** — client sends tool definitions and page context
4. **Converse** — client sends messages, server streams responses
5. **Idle timeout** — after 5 minutes of inactivity, the server cleans up
6. **Disconnect** — client or server closes the connection

## Plan System

For complex tasks, the LLM can create a multi-step plan:

1. The LLM calls `create_plan` with a title and steps
2. The client shows the plan for user approval
3. On approval, the server feeds one step at a time to the LLM
4. After each step, the LLM calls `complete_plan_step`
5. When all steps are done, the LLM calls `plan_completed`

Plans give users visibility into what the agent intends to do and let them
approve or reject the overall approach before any changes are made.

## Message Pruning

To keep the context window manageable, the server prunes old messages:

- The **last 8 turns** are kept uncompressed
- Older tool results are compressed to their `_summary` field (or a generic
  summary)
- Results from **volatile** tools are marked as `[STALE]` after any mutation
- Text attachments in older messages are truncated

This allows long conversations without hitting token limits while preserving
recent context.

## Prompt Caching

System prompt sections are ordered to maximize cache hits:

1. **Static sections** — never change (introduction, architecture, rules)
2. **Per-page sections** — stable within a conversation (page context, bundles)
3. **Per-turn sections** — change every turn (plan progress)

Cache breakpoints are inserted after static and per-page groups. For Anthropic,
these are explicit `cache_control` markers. For OpenAI, the stable prefix
enables automatic prefix caching.

## Conversation Persistence

When the adapter implements `agentConversations`, conversations can be saved and
restored:

- After each turn, the server sends a `conversation_state` snapshot
- The snapshot includes all messages, activated lazy tools, and an HMAC hash
- On restore, the server validates the hash to prevent tampering
- Conversations are limited to 7 turns for storage efficiency

## Built-in Tools

### Query Tools

| Tool                     | Description                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| `find_blocks`            | Find blocks matching filters (bundle, structure, content, options)          |
| `search_text`            | Search for text in block content with regex support                         |
| `get_selected_blocks`    | Get currently selected blocks                                               |
| `get_blocks_in_viewport` | Get blocks visible in the viewport                                          |
| `get_child_blocks`       | Get all child fields and blocks for a page or block                         |
| `get_block_context`      | Comprehensive context for a single block (parent chain, siblings, children) |
| `get_content_fields`     | Get all content fields (text, media, links) for blocks                      |
| `get_block_options`      | Get available options and current values                                    |
| `get_bundle_info`        | Get information about block types that can be added to a field              |
| `get_all_page_content`   | Get all text content from the entire page                                   |
| `get_all_fragments`      | Get all available fragments                                                 |
| `get_mutation_history`   | Get undo/redo history information                                           |
| `search_media`           | Search the media library                                                    |
| `search_templates`       | Search available templates                                                  |
| `search_reusable_blocks` | Search reusable blocks from library                                         |
| `ask_question`           | Ask the user a question with predefined options                             |
| `web_fetch`              | Fetch and extract content from web pages                                    |

### Mutation Tools

| Tool                          | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `add_blocks`                  | Add one or more new blocks (supports nested children) |
| `add_media_block`             | Add a block using a media item                        |
| `add_content_search_block`    | Add a block using a content search result             |
| `add_reusable_block`          | Add a reusable block                                  |
| `add_fragment`                | Add a fragment block                                  |
| `add_template`                | Add a template                                        |
| `delete_blocks`               | Delete one or more blocks                             |
| `duplicate_blocks`            | Duplicate blocks with all children                    |
| `move_blocks`                 | Move blocks to a different parent field               |
| `swap_blocks`                 | Swap positions of two blocks                          |
| `rearrange_blocks`            | Reorder blocks within a field                         |
| `update_text_fields`          | Rewrite text in multiple fields at once               |
| `set_block_options`           | Set options on blocks                                 |
| `replace_media_field`         | Replace media on an existing block                    |
| `replace_content_search_item` | Replace a content reference                           |
| `detach_reusable_block`       | Detach library blocks to create editable copies       |
| `go_to_history_index`         | Navigate to a specific point in undo/redo history     |

### Server-side Tools

These tools are handled entirely on the server:

| Tool                 | Description                                  |
| -------------------- | -------------------------------------------- |
| `load_skill`         | Load a skill's content into the conversation |
| `load_tools`         | Activate lazy tools                          |
| `create_plan`        | Create a multi-step plan for user approval   |
| `complete_plan_step` | Mark the current plan step as complete       |
| `plan_completed`     | Mark the entire plan as complete             |

## Built-in Skills

| Skill                          | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| `page-review`                  | Guidance for reviewing and analyzing page content          |
| `rewrite-and-translate`        | Guidelines for batch rewriting and translating text        |
| `from-library-reusable-blocks` | How to work with reusable blocks from the library          |
| `adding-new-blocks`            | Comprehensive guide for adding blocks with nested children |

## Error Types

| Error Type       | Cause                           |
| ---------------- | ------------------------------- |
| `authentication` | Invalid API key (401)           |
| `rate_limit`     | Too many requests (429)         |
| `overloaded`     | Service overloaded (529/503)    |
| `not_found`      | Invalid model or endpoint (404) |
| `bad_request`    | Malformed request (400)         |
| `connection`     | Network/connection failure      |
| `unauthorized`   | Invalid WebSocket auth token    |
| `unknown`        | Unclassified error              |
