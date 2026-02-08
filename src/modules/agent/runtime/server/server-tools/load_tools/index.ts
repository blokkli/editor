import { z } from 'zod'
import { defineServerSideTool } from '..'

export default defineServerSideTool({
  name: 'load_tools',
  description:
    'Load additional tools by name before using them. You must call this before using any tool listed under "Additional Tools" in the system prompt.',

  inputSchema(ctx) {
    return z.object({
      tools: z
        .array(
          z.enum(
            ctx.unloadedLazyTools.map((t) => t.name) as [string, ...string[]],
          ),
        )
        .describe('Tool names to activate'),
    })
  },

  isAvailable(ctx) {
    return ctx.unloadedLazyTools.length > 0
  },

  handle(ctx, input) {
    const loaded: string[] = []

    for (const name of input.tools) {
      if (ctx.lazyTools.some((t) => t.name === name)) {
        ctx.activatedLazyTools.add(name)
        loaded.push(name)
      }
    }

    if (loaded.length) {
      ctx.send({
        type: 'server_tool_result',
        tool: 'load_tools',
        label: String(loaded.length),
      })
    }

    return {
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: ctx.toolUseId,
          content: JSON.stringify({ loaded }),
        },
      ],
    }
  },
})
