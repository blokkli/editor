import { z } from 'zod'
import { defineServerSideTool } from '..'

export default defineServerSideTool({
  name: 'load_tools',
  description:
    'Load additional tools by name before using them. You must call this before using any tool listed under "Additional Tools" in the system prompt.',

  inputSchema(ctx) {
    // Accept any tool name as a plain string rather than an enum of lazy tools.
    // The LLM sometimes asks to load a tool that's already active or isn't lazy
    // at all (a regular, always-available tool). Both are harmless no-ops, but
    // a strict enum rejects the non-lazy name as invalid input, forcing a
    // wasted retry loop. `handle` activates the lazy names and silently ignores
    // the rest.
    return z.object({
      tools: z
        .array(z.string())
        .describe(
          ctx.lazyToolNames.length
            ? `Tool names to activate. Loadable tools: ${ctx.lazyToolNames.join(', ')}.`
            : 'Tool names to activate.',
        ),
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
