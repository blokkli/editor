import { z } from 'zod'
import { defineServerSideTool } from '..'

export default defineServerSideTool({
  name: 'load_skills',
  description:
    'Load detailed guidelines for one or more skills (up to 3 at once). Call this before writing or editing content that should follow specific rules or guidelines.',

  inputSchema(ctx) {
    return z.object({
      names: z
        .array(
          z.enum(
            ctx.resolvedSkills.map((s) => s.name) as [string, ...string[]],
          ),
        )
        .min(1)
        .max(3)
        .describe('The skills to load'),
    })
  },

  isAvailable(ctx) {
    return ctx.resolvedSkills.length > 0
  },

  handle(ctx, input) {
    const loaded: string[] = []
    const autoLoaded: string[] = []
    const errors: string[] = []
    const extraBlocks: { type: 'skill'; name: string; text: string }[] = []

    for (const name of input.names) {
      const skill = ctx.resolvedSkills.find((s) => s.name === name)
      if (!skill) {
        errors.push(name)
        continue
      }

      ctx.loadedSkills.add(skill.name)
      loaded.push(skill.name)

      // Auto-activate any tools declared by the skill
      for (const toolName of skill.tools) {
        if (
          ctx.lazyToolNames.includes(toolName) &&
          !ctx.activatedLazyTools.has(toolName)
        ) {
          ctx.activatedLazyTools.add(toolName)
          autoLoaded.push(toolName)
        }
      }

      ctx.send({
        type: 'server_tool_result',
        tool: 'load_skills',
        label: skill.label,
      })

      extraBlocks.push({
        type: 'skill',
        name: skill.name,
        text: `# Skill: ${skill.name}\n\n${skill.content}`,
      })
    }

    if (loaded.length > 0) {
      ctx.markPlanStepWork()
      return {
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: ctx.toolUseId,
            content: JSON.stringify({
              loaded,
              ...(autoLoaded.length ? { tools_loaded: autoLoaded } : {}),
              ...(errors.length ? { not_found: errors } : {}),
            }),
          },
        ],
        extraBlocks,
      }
    }

    return {
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: ctx.toolUseId,
          content: JSON.stringify({
            error: `Skills not found: ${errors.join(', ')}`,
          }),
          is_error: true,
        },
      ],
    }
  },
})
