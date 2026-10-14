import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { enableMock, toolDefinitions } from '#blokkli-build/agent-server'
import type { UsageTurn, RoutingRequest } from '../shared/types'
import { resolveSkills } from './helpers/skills'
import { preprocessPrompt } from './helpers/routing'
import { validateToken } from './helpers/security'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const body = await readBody<RoutingRequest>(event)

  const empty = {
    skills: [] as string[],
    tools: [] as string[],
    usage: null as UsageTurn | null,
  }

  // Routing calls the model with the server's key: only for clients the
  // backend let in, like the WebSocket and the stream.
  const authSecret = config.blokkli?.agent?.authSecret
  if (!authSecret || !validateToken(body.authToken, authSecret)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Mock mode: a client with a mock script always sends `mockRouting` (empty
  // when the script has no routing entry), and gets it back without touching
  // the configured LLM. So the E2E suite is safe to run alongside a populated
  // `.env`, and conversations without a script are routed as usual.
  if (enableMock && body.mockRouting) {
    return {
      skills: body.mockRouting.skills ?? [],
      tools: body.mockRouting.tools ?? [],
      usage: null,
    }
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
