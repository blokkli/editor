import type { PageContext } from '../shared/types'
import type { ResolvedSkill } from './skills/types'
import type { SystemPromptContext } from './system-prompts/types'
import { debugPrompt, systemPrompts } from '#blokkli-build/agent-server'

/**
 * Build the complete system prompt for the AI agent.
 * Assembles all registered system prompt sections, filtered by mode and sorted by weight.
 */
export function buildSystemPrompt(
  context: PageContext,
  resolvedSkills: ResolvedSkill[],
  lazyTools: { name: string; description: string }[] = [],
): string {
  const promptContext: SystemPromptContext = {
    pageContext: context,
    resolvedSkills,
    lazyTools,
    isDebugMode: !!(import.meta.dev && debugPrompt),
  }

  return systemPrompts
    .filter((sp) => !sp.modes?.length || sp.modes.includes(context.editMode))
    .sort((a, b) => a.weight - b.weight)
    .map((sp) => {
      const text = sp.getPrompt(promptContext)
      if (text === null) return null
      return sp.title ? `## ${sp.title}\n\n${text}` : text
    })
    .filter((t): t is string => t !== null)
    .join('\n\n')
}
