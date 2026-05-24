import { provider, models } from '#blokkli-build/agent-server'
import { createUsageTurn } from './index'
import type { ResolvedSkill } from '../skills/types'
import type { AgentModelDefinition, UsageTurn } from '../../shared/types'

export type RoutingResult = {
  skills: string[]
  tools: string[]
  usage?: UsageTurn
}

/**
 * Resolve the routing model from the models array.
 * Uses the model with `routing: true`, or falls back to the default model.
 */
function getRoutingModel(): AgentModelDefinition | null {
  if (!models.length) return null
  return (
    models.find((m) => m.routing) ||
    models.find((m) => m.isDefault) ||
    models[0]!
  )
}

/**
 * Pre-process the user's prompt to determine which skills and lazy tools
 * should be pre-loaded before the main agent loop.
 *
 * Uses a fast/cheap model to analyze the prompt and return structured output.
 * Returns null when routing is not configured, not applicable, or on error.
 */
export async function preprocessPrompt(
  apiKey: string,
  prompt: string,
  resolvedSkills: ResolvedSkill[],
  lazyToolSummaries: { name: string; description: string }[],
  signal?: AbortSignal,
): Promise<RoutingResult | null> {
  const routingModelDef = getRoutingModel()
  if (!routingModelDef) return null
  if (resolvedSkills.length === 0 && lazyToolSummaries.length === 0) return null

  const skillNames = resolvedSkills.map((s) => s.name)
  const toolNames = lazyToolSummaries.map((t) => t.name)

  // Build the routing tool with enum constraints for valid names
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  if (skillNames.length > 0) {
    properties['skills'] = {
      type: 'array',
      items: { type: 'string', enum: skillNames },
      description: 'Skills to pre-load based on the user prompt.',
    }
    required.push('skills')
  }

  if (toolNames.length > 0) {
    properties['tools'] = {
      type: 'array',
      items: { type: 'string', enum: toolNames },
      description: 'Tools to pre-load based on the user prompt.',
    }
    required.push('tools')
  }

  const routeTool = {
    name: 'route_prompt',
    description:
      'Select which skills and tools are relevant for the user prompt.',
    input_schema: {
      type: 'object' as const,
      properties,
      required,
    },
  }

  // Build a minimal prompt listing available skills and tools
  const lines: string[] = []

  if (resolvedSkills.length > 0) {
    lines.push('Available skills:')
    for (const skill of resolvedSkills) {
      lines.push(`- ${skill.name}: ${skill.description}`)
    }
    lines.push('')
  }

  if (lazyToolSummaries.length > 0) {
    lines.push('Available tools:')
    for (const tool of lazyToolSummaries) {
      lines.push(`- ${tool.name}: ${tool.description}`)
    }
    lines.push('')
  }

  lines.push('User message:')
  lines.push(prompt)

  try {
    let toolInput = ''
    let usage: UsageTurn | undefined

    const stream = provider.createStream(
      { apiKey, model: routingModelDef.name },
      {
        systemPrompt: [
          {
            text: `You are a routing layer for an AI assistant embedded in blökkli, a page editor for structured content (paragraphs/blocks). The assistant helps users create, edit, move, and manage page content using MCP tools and skills.

Given the user's message, select which skills and tools should be pre-loaded. Only select items that are clearly relevant to the request. Select nothing if the message is a simple greeting or unrelated to the available options.`,
          },
        ],
        messages: [{ role: 'user', content: lines.join('\n') }],
        tools: [routeTool],
        maxTokens: 256,
        toolChoice: 'any',
        signal,
      },
    )

    for await (const event of stream) {
      if (signal?.aborted) return null

      if (event.type === 'tool_use_delta') {
        toolInput += event.partial_json
      } else if (event.type === 'message_end') {
        usage = createUsageTurn(event, routingModelDef) ?? usage
      } else if (event.type === 'error') {
        console.warn('[blokkli:agent] Routing error:', event.error.message)
        return null
      }
    }

    if (!toolInput) return null

    const parsed = JSON.parse(toolInput) as {
      skills?: string[]
      tools?: string[]
    }

    // Validate against known names
    const validSkills = new Set(skillNames)
    const validTools = new Set(toolNames)

    return {
      skills: (parsed.skills ?? []).filter((s) => validSkills.has(s)),
      tools: (parsed.tools ?? []).filter((t) => validTools.has(t)),
      usage,
    }
  } catch (error) {
    console.warn(
      '[blokkli:agent] Routing failed:',
      error instanceof Error ? error.message : error,
    )
    return null
  }
}
