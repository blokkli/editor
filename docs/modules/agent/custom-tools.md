# Custom Tools

Tools are the primary way the agent interacts with the page. You can define
custom tools to extend the agent with project-specific capabilities.

## File Location

Place tool files in `blokkli/tools/` in your project root. Each tool is a
TypeScript file (or directory with `index.ts`) that default-exports a tool
definition. They are auto-discovered at build time.

```
blokkli/
  tools/
    my-query-tool.ts
    my-mutation-tool/
      index.ts
      Component.vue
```

## Basic Structure

```ts
// blokkli/tools/my-tool.ts
import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID'),
})

const resultSchema = z.object({
  found: z.boolean(),
})

export default defineBlokkliAgentTool({
  name: 'my_tool',
  description: 'Describe what this tool does — this text is shown to the LLM.',
  category: 'query',
  modes: ['editing', 'translating', 'readonly', 'review'],
  label: ($t) => 'Loading...',
  paramsSchema,
  resultSchema,

  execute: (ctx, params) => {
    const block = ctx.app.blocks.getBlock(params.uuid)
    return {
      label: 'Found block',
      result: { found: !!block },
    }
  },
})
```

## Properties

### Required

| Property       | Type                    | Description                                                                                      |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `name`         | `string`                | Unique tool name in `snake_case`                                                                 |
| `description`  | `string`                | Description shown to the LLM                                                                     |
| `category`     | `'query' \| 'mutation'` | Whether the tool reads or modifies state                                                         |
| `modes`        | `EditMode[]`            | Edit modes where this tool is available (`'editing'`, `'translating'`, `'readonly'`, `'review'`) |
| `label`        | `($t) => string`        | Label shown while the tool is executing                                                          |
| `paramsSchema` | `z.ZodType`             | Zod schema for input parameters                                                                  |
| `resultSchema` | `z.ZodType`             | Zod schema for the result                                                                        |
| `execute`      | `(ctx, params) => ...`  | The tool implementation                                                                          |

### Optional

| Property                 | Type                 | Description                                                                                                         |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `icon`                   | `string`             | Icon name displayed in the UI                                                                                       |
| `lazy`                   | `boolean`            | If `true`, tool is not sent to the LLM until activated via `load_tools`. Listed by name in the system prompt.       |
| `volatile`               | `boolean`            | If `true`, results from this tool are marked as stale after any mutation. Use for tools that return page structure. |
| `requiresApproval`       | `boolean`            | If `true`, mutation tools require explicit user approval before applying.                                           |
| `requiredAdapterMethods` | `AdapterMethods[]`   | Adapter methods that must exist for this tool to be available.                                                      |
| `component`              | `Component`          | Vue component for interactive tools (see below).                                                                    |
| `prunedSummary`          | `(result) => string` | Compute a summary string used during message pruning instead of the full result.                                    |

## Query Tools

Query tools read data without modifying state. They execute immediately without
user approval.

The `execute` function must return a `QueryResult`:

```ts
type QueryResult<T> = {
  label: string // Shown in the conversation UI
  result: T // Data sent to the LLM
  affectedUuids?: string[] // Blocks to select and scroll into view
}
```

### Example: Query Tool

```ts
import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  message: z.string().optional().describe('Optional message to echo back'),
})

const resultSchema = z.object({
  success: z.boolean().describe('Whether the ping was successful'),
  message: z.string().describe('Response message'),
  timestamp: z.number().describe('Unix timestamp of the response'),
})

export default defineBlokkliAgentTool({
  name: 'ping',
  description:
    'A simple test tool that returns a success response. Use this to verify the agent is working.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: () => 'Pinging...',
  paramsSchema,
  resultSchema,
  execute: (_ctx, params) => {
    return {
      label: 'Pong!',
      result: {
        success: true,
        message: params.message ? `Pong: ${params.message}` : 'Pong!',
        timestamp: Date.now(),
      },
    }
  },
})
```

## Mutation Tools

Mutation tools modify state. They return a `MutationAction` that the framework
applies (optionally after user approval).

```ts
type MutationAction = {
  type: 'add' | 'delete' | 'move' | 'rewrite' | 'options'
  label: string // Shown in the conversation UI
  apply: (adapter) => Promise<MutationResponseLike>
  revert?: () => void // Called if user rejects (for preview-based tools)
  result?: Record<string, unknown> // Extra data included in the LLM response
  affectedUuids?: string[] // Blocks to select and scroll into view
}
```

### Example: Mutation Tool

```ts
import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  uuid: z.string().describe('UUID of the block to archive'),
})

const resultSchema = z.object({
  success: z.boolean(),
})

export default defineBlokkliAgentTool({
  name: 'archive_block',
  description: 'Archive a block by setting its status option to archived.',
  category: 'mutation',
  modes: ['editing'],
  label: () => 'Archiving block...',
  paramsSchema,
  resultSchema,

  execute: (ctx, params) => {
    return {
      type: 'options',
      label: 'Archive block',
      apply: (adapter) => {
        return adapter.updateOptions([
          { uuid: params.uuid, key: 'status', value: 'archived' },
        ])
      },
      affectedUuids: [params.uuid],
    }
  },
})
```

## The Execute Context

The `ctx` parameter provides:

| Property             | Type             | Description                                              |
| -------------------- | ---------------- | -------------------------------------------------------- |
| `ctx.app`            | `BlokkliApp`     | The full blökkli app instance (state, DOM, blocks, etc.) |
| `ctx.adapter`        | `BlokkliAdapter` | The adapter with required methods guaranteed             |
| `ctx.itemEntityType` | `string`         | The item entity type from module config                  |

## Required Adapter Methods

If your tool depends on optional adapter methods, declare them with
`requiredAdapterMethods`. The tool is only registered when those methods exist
on the adapter:

```ts
export default defineBlokkliAgentTool({
  name: 'my_tool',
  requiredAdapterMethods: ['swapBlocks'] as const,
  // ...
  execute: (ctx, params) => {
    // ctx.adapter.swapBlocks is guaranteed to exist and typed as non-optional
    return ctx.adapter.swapBlocks(params.first, params.second)
  },
})
```

## Interactive Component Tools

For tools that need user interaction beyond simple approve/reject, provide a Vue
component:

```ts
export default defineBlokkliAgentTool({
  name: 'batch_edit',
  component: BatchEditComponent,
  // ...
  execute: (ctx, params) => {
    // Return data passed to the component as props
    return { blocks: params.uuids.map((uuid) => ctx.app.blocks.getBlock(uuid)) }
  },
})
```

The component receives `{ context, params }` props and must emit a `'done'`
event with the final result matching `resultSchema`. The component is
responsible for rendering the UI, applying changes, and emitting the result.

## Lazy Tools

Mark tools as `lazy: true` to keep them out of the initial tool set. The LLM
sees their name and description in the system prompt and can load them on demand
via the built-in `load_tools` tool:

```ts
export default defineBlokkliAgentTool({
  name: 'advanced_search',
  lazy: true,
  // ...
})
```

This is useful for tools that are rarely needed or have large schemas.

## Volatile Tools

Mark tools as `volatile: true` if their results become stale after mutations:

```ts
export default defineBlokkliAgentTool({
  name: 'get_page_stats',
  volatile: true,
  // ...
})
```

Old results from volatile tools are marked as stale during message pruning,
telling the LLM it should re-query if it needs current data.

## Tool Factories

Use a factory to create tools dynamically based on runtime state:

```ts
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentTool({
  resolve: async (ctx) => {
    // Check if the adapter supports content search
    if (!ctx.adapter.getContentSearchTabs) return []

    const tabs = await ctx.adapter.getContentSearchTabs()
    return Object.entries(tabs).map(([id, label]) =>
      defineBlokkliAgentTool({
        name: `search_${id}`,
        description: `Search ${label} content`,
        category: 'query',
        requiredAdapterMethods: ['getContentSearchResults'] as const,
        modes: ['editing'],
        // ... full tool definition for each tab
      }),
    )
  },
})
```

The `resolve` function is called once when the agent connects and returns an
array of tool definitions.
