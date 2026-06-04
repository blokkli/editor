import { defineEventHandler, readBody, useRuntimeConfig } from '#imports'
import { enableMock, toolDefinitions } from '#blokkli-build/agent-server'
import type { UsageTurn, RoutingRequest } from '../shared/types'
import { resolveSkills } from './helpers/skills'
import { preprocessPrompt } from './helpers/routing'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const body = await readBody<RoutingRequest>(event)

  const empty = {
    skills: [] as string[],
    tools: [] as string[],
    usage: null as UsageTurn | null,
  }

  // Mock mode: honour the script's routing entry without touching the
  // configured LLM. Without `mockRouting`, mock sessions auto-load nothing
  // — the real provider is never reached even if `apiKey` is set, so the
  // E2E suite is safe to run alongside a populated `.env`.
  if (enableMock) {
    if (body.mockRouting) {
      return {
        skills: body.mockRouting.skills ?? [],
        tools: body.mockRouting.tools ?? [],
        usage: null,
      }
    }
    return empty
  }

  const apiKey = config.blokkli?.agent?.apiKey
  if (!apiKey) {
    return empty
  }

  // Partition tool names into lazy tools using server-side definitions
  const toolDefMap = new Map(toolDefinitions.map((t) => [t.name, t]))
  const lazyToolSummaries: { name: string; description: string }[] = []

  for (const name of body.toolNames) {
    const def = toolDefMap.get(name)
    if (def?.lazy) {
      lazyToolSummaries.push({ name: def.name, description: def.description })
    }
  }

  // Resolve skills for this page context
  const resolvedSkills = resolveSkills(body.pageContext)

  // Call routing model
  const result = await preprocessPrompt(
    apiKey,
    body.prompt,
    resolvedSkills,
    lazyToolSummaries,
  )

  if (!result) {
    return empty
  }

  return {
    skills: result.skills,
    tools: result.tools,
    usage: result.usage ?? null,
  }
})
