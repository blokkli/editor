import { defineEventHandler, readBody, useRuntimeConfig } from '#imports'
import { toolDefinitions } from '#blokkli-build/agent-server'
import type { PageContext, UsageTurn } from '../shared/types'
import { resolveSkills } from './helpers'
import { preprocessPrompt } from './routing'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    prompt: string
    toolNames: string[]
    pageContext: PageContext
  }>(event)

  const empty = {
    skills: [] as string[],
    tools: [] as string[],
    usage: null as UsageTurn | null,
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
