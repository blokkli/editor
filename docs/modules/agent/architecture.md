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
3. **Initialize** — client sends tool definitions and page context. The tool
   list covers everything the client can structurally run (adapter methods
   present, availability checks pass) — it is not filtered by edit mode.
4. **Converse** — client sends messages, server streams responses. Each user
   message carries the live page state (edit mode, content language, published
   state); the server merges it into its context, filters the offered tools by
   the current edit mode on every turn, and announces changes to the LLM with an
   `[Editor context …]` note. Taking ownership or moving to a translation
   mid-conversation therefore takes effect on the next message.
5. **Idle timeout** — after 5 minutes of inactivity, the server cleans up
6. **Disconnect** — client or server closes the connection

## Plan System

For complex tasks, the LLM can create a multi-step plan:

1. The LLM calls `create_plan` with a title and steps
2. The client shows the plan for user approval
3. On approval, the server feeds one step at a time to the LLM
4. After each step, the LLM calls `complete_plan_step`, which returns the next
   step; after the last one, the plan is done

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

Most tools are lazy: the system prompt only lists them, and the LLM loads them
with `load_tools` before it uses them (or a skill or prompt loads them).

### Query Tools

| Tool                          | Description                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `find_paragraphs`             | Find paragraphs matching filters (bundle, structure, content, options)              |
| `search_text`                 | Search for text in paragraph content                                                |
| `get_selected_paragraphs`     | Get the paragraphs the user selected                                                |
| `get_paragraphs_in_viewport`  | Get the paragraphs visible in the viewport                                          |
| `get_child_paragraphs`        | Get all child fields and paragraphs of the page or a paragraph                      |
| `get_paragraph_context`       | Context of one paragraph: parent chain, siblings, children, content fields, options |
| `get_content_fields`          | Get the content fields (text, media, links) of paragraphs                           |
| `get_paragraph_options`       | Get the available options and their current values                                  |
| `get_bundle_info`             | Which paragraph types can be added to a field                                       |
| `get_page_structure`          | The page as a tree of paragraphs, fields and content previews                       |
| `get_page_text`               | The rendered page as Markdown                                                       |
| `get_all_page_content`        | A flat list of every paragraph on the page                                          |
| `get_referenced_entities`     | The entities (media, nodes, terms) that paragraphs reference                        |
| `get_all_fragments`           | Get all available fragments                                                         |
| `get_mutation_history`        | Get undo/redo history information                                                   |
| `get_readability_issues`      | Run the readability analyzers on the page                                           |
| `check_readability_for_texts` | Readability scores for given texts                                                  |
| `search_content`              | Search content items in a content search tab                                        |
| `search_media`                | Search the media library                                                            |
| `select_media`                | Let the user pick from media items                                                  |
| `search_templates`            | Search available templates                                                          |
| `search_reusable_paragraphs`  | Search reusable paragraphs from the library                                         |
| `ask_question`                | Ask the user a question with predefined options                                     |
| `web_fetch`                   | Fetch and extract content from web pages (`allowedFetchOrigins`)                    |

### Mutation Tools

| Tool                            | Description                                                    |
| ------------------------------- | -------------------------------------------------------------- |
| `add_paragraphs`                | Add one or more new paragraphs (supports nested children)      |
| `add_media_paragraph`           | Add a paragraph using a media item                             |
| `add_content_search_paragraphs` | Add a paragraph using a content search result                  |
| `add_reusable_paragraph`        | Add a reusable paragraph                                       |
| `add_fragment`                  | Add a fragment                                                 |
| `add_template`                  | Add a template                                                 |
| `delete_paragraphs`             | Delete one or more paragraphs                                  |
| `duplicate_paragraphs`          | Duplicate paragraphs with all children                         |
| `move_paragraphs`               | Move paragraphs to a different parent field                    |
| `swap_paragraphs`               | Swap positions of two paragraphs                               |
| `rearrange_paragraphs`          | Reorder paragraphs within a field                              |
| `update_text_fields`            | Update text in several fields at once                          |
| `delegate_text_rewrite`         | Rewrite, translate or generate texts, streamed (see `/stream`) |
| `auto_translate_paragraphs`     | Translate paragraphs with the backend's translation service    |
| `set_paragraph_options`         | Set options on paragraphs                                      |
| `replace_media_field`           | Replace media on an existing paragraph                         |
| `replace_content_search_item`   | Replace a content reference                                    |
| `detach_reusable_paragraph`     | Detach library paragraphs to create editable copies            |
| `go_to_history_index`           | Navigate to a specific point in undo/redo history              |

### Server-side Tools

These tools are handled entirely on the server:

| Tool                 | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `load_skills`        | Load up to three skills' content                     |
| `load_tools`         | Activate lazy tools                                  |
| `create_plan`        | Create a multi-step plan for user approval           |
| `complete_plan_step` | Mark the current plan step as done, get the next one |

## Built-in Skills

| Skill                              | Description                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| `page-review`                      | Guidance for reviewing and analyzing page content              |
| `rewrite-and-translate`            | Guidelines for batch rewriting and translating text            |
| `assess-and-fix-readability`       | How to assess and fix readability                              |
| `from-library-reusable-paragraphs` | How to work with reusable paragraphs from the library          |
| `adding-new-paragraphs`            | Comprehensive guide for adding paragraphs with nested children |

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
