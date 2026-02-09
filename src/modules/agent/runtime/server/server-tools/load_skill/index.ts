import { z } from 'zod'
import { defineServerSideTool } from '..'

export default defineServerSideTool({
  name: 'load_skill',
  description:
    'Load detailed guidelines for a specific skill. Call this before writing or editing content that should follow specific rules or guidelines.',

  inputSchema(ctx) {
    return z.object({
      name: z
        .enum(ctx.resolvedSkills.map((s) => s.name) as [string, ...string[]])
        .describe('The skill to load'),
    })
  },

  isAvailable(ctx) {
    return ctx.resolvedSkills.length > 0
  },

  handle(ctx, input) {
    const skill = ctx.resolvedSkills.find((s) => s.name === input.name)

    if (skill) {
      ctx.loadedSkills.add(skill.name)

      ctx.send({
        type: 'server_tool_result',
        tool: 'load_skill',
        label: skill.label,
      })

      return {
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: ctx.toolUseId,
            content: JSON.stringify({
              loaded: true,
              name: skill.name,
            }),
          },
        ],
        extraBlocks: [
          {
            type: 'skill',
            name: skill.name,
            text: `# Skill: ${skill.name}\n\n${skill.content}`,
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
            error: `Skill '${input.name}' not found`,
          }),
          is_error: true,
        },
      ],
    }
  },
})
