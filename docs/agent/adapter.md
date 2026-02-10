# Adapter Methods

The agent module extends the blökkli adapter with several optional methods. Only
`getAgentAuthToken()` is required for basic functionality — the others unlock
additional tools and features.

## Drupal Adapter

The Drupal adapter registers all agent adapter methods automatically when the
backend provides the required GraphQL mutations. No manual adapter code is
needed.

1. Enable the `paragraphs_blokkli_agent` Drupal submodule
2. Add the "Paragraphs Blökkli Agent" extension to your GraphQL server
   configuration
3. Grant the "Use paragraphs blökkli agent" permission to the appropriate roles

Once enabled, the Drupal adapter detects the `paragraphsBlokkliAgentToken`
mutation in the schema and automatically sets up `getAgentAuthToken()`,
`swapBlocks()`, `rearrangeBlocks()`, and `agentConversations`.

The rest of this page documents the adapter methods for **custom adapter**
implementations.

## Permission: `use_agent`

The agent module declares the `use_agent` permission. The agent sidebar is only
visible to users whose adapter returns this permission:

```ts
{
  getPermissions: () => {
    return ['use_agent']
  },
}
```

## `getAgentAuthToken()`

**Required.** Returns an HMAC authentication token for the WebSocket connection.

```ts
getAgentAuthToken?: () => Promise<string | null>
```

### How It Works

1. The client calls `getAgentAuthToken()` before connecting
2. Your adapter fetches a token from an authenticated server endpoint
3. The token is sent in the WebSocket `authenticate` message
4. The server validates it using the shared `NUXT_BLOKKLI_AGENT_AUTH_SECRET`

### Token Format

The token is `timestamp:hmac_sha256` where:

- `timestamp` is the current Unix timestamp in seconds
- `hmac_sha256` is the HMAC-SHA256 of the timestamp using the auth secret

Tokens expire after 5 minutes and are single-use.

### Server Endpoint Example

```ts
// server/api/blokkli/agent/token.ts
import { createHmac } from 'node:crypto'

export default defineEventHandler(() => {
  // Verify the user is authenticated and authorized.
  // This depends on your auth setup (session, JWT, etc.).

  const config = useRuntimeConfig()
  const authSecret = config.blokkli?.agent?.authSecret
  if (!authSecret) {
    throw createError({
      statusCode: 500,
      message: 'authSecret not configured',
    })
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const hmac = createHmac('sha256', authSecret).update(timestamp).digest('hex')
  return { token: `${timestamp}:${hmac}` }
})
```

### Adapter Implementation

```ts
{
  getAgentAuthToken: async () => {
    const response = await $fetch('/api/blokkli/agent/token')
    return response.token
  },
}
```

## `swapBlocks()`

**Optional.** Enables the `swap_blocks` tool.

```ts
swapBlocks?: (first: string, second: string) => Promise<MutationResponseLike<T>>
```

Swaps the positions of two blocks identified by their UUIDs.

## `rearrangeBlocks()`

**Optional.** Enables the `rearrange_blocks` tool.

```ts
rearrangeBlocks?: (e: {
  host: BlokkliItemHost
  uuids: string[]
}) => Promise<MutationResponseLike<T>>
```

Reorders blocks within a single field. All provided UUIDs must belong to the
same field. The blocks are reordered to match the given array order.

## `agentConversations`

**Optional.** Enables conversation persistence — saving, loading, and resuming
conversations.

```ts
agentConversations?: {
  upsert: (data: AgentConversationData) => Promise<boolean>
  load: (uuid: string) => Promise<AgentConversationData | null>
  loadLatest: () => Promise<AgentConversationData | null>
  list: () => Promise<AgentConversationSummary[]>
  delete: (uuid: string) => Promise<boolean>
}
```

### Types

```ts
type AgentConversationData = {
  uuid: string
  title: string
  clientState: string // JSON-encoded client state
  serverState: string // JSON-encoded server state (messages + hash)
  hash: string // HMAC integrity hash
}

type AgentConversationSummary = {
  uuid: string
  title: string
  createdAt: string // ISO timestamp, managed by backend
  updatedAt: string // ISO timestamp, managed by backend
}
```

### Methods

| Method         | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| `upsert(data)` | Create or update a conversation. Returns `true` on success. |
| `load(uuid)`   | Load a conversation by UUID. Returns `null` if not found.   |
| `loadLatest()` | Load the most recently updated conversation.                |
| `list()`       | List all conversations for the current entity.              |
| `delete(uuid)` | Delete a conversation. Returns `true` on success.           |

The backend is responsible for managing `createdAt` and `updatedAt` timestamps.
The `hash` field ensures conversation integrity — the server generates it and
validates it when restoring.
