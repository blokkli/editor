import type { PageContext, EditMode } from '../../shared/types'
import type { ResolvedSkill } from '../skills/types'

export type ActivePlanContext = {
  title: string
  totalSteps: number
  completedSteps: number
  currentStep: { label: string; description: string }
  remainingSteps: string[]
}

export type SystemPromptContext = {
  pageContext: PageContext
  resolvedSkills: ResolvedSkill[]
  lazyTools: { name: string; description: string }[]
  isDebugMode: boolean
  activePlan?: ActivePlanContext
  loadedSkills: ReadonlySet<string>
}

export type SystemPromptDefinition = {
  id: string
  title: string
  weight: number
  modes?: EditMode[]
  /**
   * Cache group for prompt caching optimization.
   * - 'static': Content never changes (cached indefinitely within TTL).
   * - 'per-page': Content is stable across turns within a conversation (cached per page context).
   * - Omit for per-turn content that changes every turn (e.g. plan progress).
   *
   * Prompts are sorted by cache group (static → per-page → per-turn), then by weight.
   * This ensures stable prefixes for both Anthropic (explicit breakpoints) and OpenAI (automatic prefix caching).
   */
  cacheGroup?: 'static' | 'per-page'
  getPrompt: (context: Readonly<SystemPromptContext>) => string | null
}

/**
 * A single block in the structured system prompt.
 * Providers use cacheHint to apply provider-specific caching strategies.
 */
export type SystemPromptBlock = {
  text: string
  /** When set, signals that everything up to and including this block can be cached. */
  cacheHint?: 'ephemeral'
}
