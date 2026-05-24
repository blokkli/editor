import { z } from 'zod'
import { defineServerSideTool } from '..'

export default defineServerSideTool({
  name: 'load_tools',
  description:
    'Load additional tools by name before using them. You must call this before using any tool listed under "Additional Tools" in the system prompt.',

  inputSchema(ctx) {
    // Accept any lazy tool name, not just the currently-unloaded ones. The LLM
    // sometimes re-loads a tool it already activated; rejecting that as invalid
    // input only forces a wasted retry loop. `handle` re-activates idempotently.
    return z.object({
      tools: z
        .array(z.enum(ctx.lazyToolNames as [string, ...string[]]))
        .describe('Tool names to activate'),
    })
  },

  isAvailable(ctx) {
    return ctx.unloadedLazyTools.length > 0
  },

  handle(ctx, input) {
    const loaded: string[] = []

    for (const name of input.tools) {
      if (ctx.lazyToolNames.includes(name)) {
        ctx.activatedLazyTools.add(name)
        loaded.push(name)
      }
    }

    if (loaded.length) {
      ctx.markPlanStepWork()
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
