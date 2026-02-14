import type { PageContext, TranscriptSystemPrompt } from '../shared/types'
import type { ResolvedSkill } from './skills/types'
import type {
  ActivePlanContext,
  SystemPromptBlock,
  SystemPromptContext,
  SystemPromptDefinition,
} from './system-prompts/types'
import { debugPrompt, systemPrompts } from '#blokkli-build/agent-server'

/**
 * Cache-group sort order: static first, then per-page, then per-turn (no group).
 */
const CACHE_GROUP_ORDER: Record<string, number> = {
  static: 0,
  'per-page': 1,
}

function getCacheGroupOrder(sp: SystemPromptDefinition): number {
  return sp.cacheGroup ? (CACHE_GROUP_ORDER[sp.cacheGroup] ?? 2) : 2
}

/**
 * Build structured system prompt blocks for the AI agent.
 * Returns an array of text blocks with optional cache hints.
 *
 * Prompts are sorted by cacheGroup (static → per-page → per-turn), then by weight.
 * A cacheHint is placed on the last block of each cacheable group boundary,
 * enabling providers to apply their caching strategy.
 */
export function buildSystemPrompt(
  context: PageContext,
  resolvedSkills: ResolvedSkill[],
  lazyTools: { name: string; description: string }[] = [],
  activePlan?: ActivePlanContext,
  loadedSkills: ReadonlySet<string> = new Set(),
): SystemPromptBlock[] {
  const promptContext: SystemPromptContext = {
    pageContext: context,
    resolvedSkills,
    lazyTools,
    isDebugMode: !!(import.meta.dev && debugPrompt),
    activePlan,
    loadedSkills,
  }

  // Filter and sort: by cache group first, then by weight within each group
  const sorted = systemPrompts
    .filter((sp) => !sp.modes?.length || sp.modes.includes(context.editMode))
    .sort((a, b) => {
      const groupDiff = getCacheGroupOrder(a) - getCacheGroupOrder(b)
      if (groupDiff !== 0) return groupDiff
      return a.weight - b.weight
    })

  // Build text blocks with their cache group
  const entries: { text: string; cacheGroup?: 'static' | 'per-page' }[] = []
  for (const sp of sorted) {
    const text = sp.getPrompt(promptContext)?.trim()
    if (!text) continue
    const formatted = sp.title ? `## ${sp.title}\n\n${text}` : text
    entries.push({ text: formatted, cacheGroup: sp.cacheGroup })
  }

  // Convert to SystemPromptBlock[], placing cacheHint at group boundaries
  const blocks: SystemPromptBlock[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const nextEntry = entries[i + 1]

    // Place a cache hint when this is the last block in a cacheable group
    // (i.e. the next block has a different or no cache group)
    const isLastInGroup =
      entry.cacheGroup &&
      (!nextEntry || nextEntry.cacheGroup !== entry.cacheGroup)

    const block: SystemPromptBlock = { text: entry.text }
    if (isLastInGroup) {
      block.cacheHint = 'ephemeral'
    }
    blocks.push(block)
  }

  return blocks
}

/**
 * Build a plain-text system prompt string (for transcript/debug use).
 */
export function buildSystemPromptText(
  context: PageContext,
  resolvedSkills: ResolvedSkill[],
  lazyTools: { name: string; description: string }[] = [],
  activePlan?: ActivePlanContext,
  loadedSkills: ReadonlySet<string> = new Set(),
): string {
  return buildSystemPrompt(
    context,
    resolvedSkills,
    lazyTools,
    activePlan,
    loadedSkills,
  )
    .map((b) => b.text)
    .join('\n\n')
}

/**
 * Build structured system prompt entries for the transcript.
 * Returns one entry per prompt definition with id, name, and content.
 */
export function buildSystemPromptEntries(
  context: PageContext,
  resolvedSkills: ResolvedSkill[],
  lazyTools: { name: string; description: string }[] = [],
  activePlan?: ActivePlanContext,
  loadedSkills: ReadonlySet<string> = new Set(),
): TranscriptSystemPrompt[] {
  const promptContext: SystemPromptContext = {
    pageContext: context,
    resolvedSkills,
    lazyTools,
    isDebugMode: !!(import.meta.dev && debugPrompt),
    activePlan,
    loadedSkills,
  }

  const sorted = systemPrompts
    .filter((sp) => !sp.modes?.length || sp.modes.includes(context.editMode))
    .sort((a, b) => {
      const groupDiff = getCacheGroupOrder(a) - getCacheGroupOrder(b)
      if (groupDiff !== 0) return groupDiff
      return a.weight - b.weight
    })

  const entries: TranscriptSystemPrompt[] = []
  for (const sp of sorted) {
    const text = sp.getPrompt(promptContext)?.trim()
    if (!text) continue
    entries.push({
      id: sp.id,
      name: sp.title,
      content: text,
    })
  }

  return entries
}
