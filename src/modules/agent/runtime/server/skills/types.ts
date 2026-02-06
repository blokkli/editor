import type { PageContext } from '../../shared/types'

/**
 * Translatable label: either a plain string or an object keyed by language code.
 * When an object, 'en' is required as fallback, other languages are optional.
 */
export type SkillLabel =
  | string
  | {
      en: string
      de?: string
      fr?: string
      it?: string
      gsw_CH?: string
    }

/**
 * Skill definition with context-aware content getter.
 * Used by defineBlokkliAgentSkill() to define skills as TypeScript modules.
 */
export type SkillDefinition = {
  /** Unique identifier (kebab-case) */
  name: string
  /** Human-readable label shown in the conversation UI */
  label: SkillLabel
  /** When to use this skill */
  description: string
  /**
   * Get the skill content for the given page context.
   * Return null if the skill is not applicable for this context.
   */
  getContents: (context: PageContext) => string | null
}

/**
 * Resolved skill after getContents has been called.
 * Contains the actual content for display/use.
 */
export type ResolvedSkill = {
  /** Unique identifier (kebab-case) */
  name: string
  /** Human-readable label shown in the conversation UI */
  label: string
  /** When to use this skill */
  description: string
  /** The resolved content for this context */
  content: string
}
