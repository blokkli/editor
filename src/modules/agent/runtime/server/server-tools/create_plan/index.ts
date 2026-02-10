import { z } from 'zod'
import { defineServerSideTool } from '..'
import type { ServerPlanStep } from '..'

const schema = z.object({
  title: z.string().describe('Short title for the plan'),
  steps: z
    .array(
      z.object({
        label: z
          .string()
          .describe('Short label shown to the user (e.g. "Add hero section")'),
        description: z
          .string()
          .describe(
            'Detailed instructions for yourself on what to do in this step',
          ),
      }),
    )
    .min(2)
    .describe('The steps of the plan'),
})

export default defineServerSideTool({
  name: 'create_plan',
  description:
    'Create a step-by-step plan for a complex task. The user will review and approve the plan before you proceed. Each step needs a short label (shown to the user) and a detailed description (your notes on what to do). Do NOT create plans for simple tasks.',

  inputSchema() {
    return schema
  },

  isAvailable(ctx) {
    return !ctx.plan
  },

  async handle(ctx, input) {
    const title = input.title || 'Plan'
    const steps: ServerPlanStep[] = input.steps.map((s) => ({
      label: s.label,
      description: s.description,
      status: 'pending',
    }))

    ctx.setPlan({ title, steps })

    // Send plan to client (labels only)
    ctx.send({
      type: 'plan_update',
      plan: ctx.toClientPlan()!,
    })

    // Send server_tool_result for UI
    ctx.send({
      type: 'server_tool_result',
      tool: 'create_plan',
      label: title,
    })

    // Commit messages before awaiting approval
    ctx.commitMessagesEarly({
      type: 'tool_result',
      tool_use_id: ctx.toolUseId,
      content: JSON.stringify({
        status: 'awaiting_approval',
        title,
        steps: steps.map((s) => s.label),
      }),
    })

    // Wait for user approval
    const approved = await ctx.waitForPlanApproval()

    if (approved) {
      // Use the local steps array (ctx.plan is a snapshot from construction time)
      steps[0].status = 'in_progress'
      ctx.send({
        type: 'plan_update',
        plan: ctx.toClientPlan()!,
      })

      // Replace the placeholder tool result with approval + first step
      ctx.updateLastToolResult(
        ctx.toolUseId,
        JSON.stringify({
          approved: true,
          message: 'Plan approved. Start executing now.',
          current_step: {
            label: steps[0].label,
            description: steps[0].description,
          },
        }),
      )
    } else {
      // Plan rejected
      ctx.updateLastToolResult(
        ctx.toolUseId,
        JSON.stringify({
          approved: false,
          message:
            'The user rejected the plan. Ask what they would like to change.',
        }),
      )
      ctx.setPlan(null)
      ctx.send({
        type: 'plan_update',
        plan: null,
      })
    }

    return {
      toolResults: [],
      messagesCommitted: true,
    }
  },
})
