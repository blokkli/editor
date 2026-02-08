import { z } from 'zod'
import { defineServerSideTool } from '..'

const schema = z.object({})

export default defineServerSideTool({
  name: 'complete_plan_step',
  description:
    'Mark the current plan step as completed and get the next step. Call this when you have finished all work for the current step.',

  inputSchema() {
    return schema
  },

  isAvailable(ctx) {
    return (
      !!ctx.plan &&
      ctx.plan.steps.some(
        (s) => s.status === 'in_progress' || s.status === 'pending',
      )
    )
  },

  handle(ctx) {
    if (!ctx.plan) {
      return {
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: ctx.toolUseId,
            content: JSON.stringify({ error: 'No active plan' }),
            is_error: true,
          },
        ],
      }
    }

    // Find current in_progress step and mark completed
    const currentStep = ctx.plan.steps.find((s) => s.status === 'in_progress')
    if (currentStep) {
      currentStep.status = 'completed'
    }

    // Find next pending step and mark in_progress
    const nextStep = ctx.plan.steps.find((s) => s.status === 'pending')
    if (nextStep) {
      nextStep.status = 'in_progress'
    }

    // Send server_tool_result for UI first
    ctx.send({
      type: 'server_tool_result',
      tool: 'complete_plan_step',
      label: currentStep?.label || 'Step completed',
    })

    // Send updated plan to client
    ctx.send({
      type: 'plan_update',
      plan: ctx.toClientPlan()!,
    })

    if (nextStep) {
      return {
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: ctx.toolUseId,
            content: JSON.stringify({
              completed: currentStep?.label,
              next_step: {
                label: nextStep.label,
                description: nextStep.description,
              },
            }),
          },
        ],
      }
    }

    return {
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: ctx.toolUseId,
          content: JSON.stringify({
            completed: currentStep?.label,
            all_steps_completed: true,
            message: 'All plan steps are completed. Summarize what was done.',
          }),
        },
      ],
    }
  },
})
