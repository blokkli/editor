import type { AgentModelDefinition, UsageTurn } from '../../shared/types'

/**
 * Model selection and per-turn usage accounting.
 */

/**
 * The model used for the main agent loop: the one flagged `isDefault`, or the
 * first configured model as a fallback.
 */
export function getDefaultModel(
  models: AgentModelDefinition[],
): AgentModelDefinition | undefined {
  return models.find((m) => m.isDefault) || models[0]
}

/**
 * Build a `UsageTurn` from a provider `message_end` event and the model that
 * produced it (for pricing). Returns undefined when token counts are absent,
 * so callers can skip emitting a usage message.
 */
export function createUsageTurn(
  event: {
    inputTokens?: number
    outputTokens?: number
    cacheCreationInputTokens?: number
    cacheReadInputTokens?: number
  },
  model: AgentModelDefinition | null | undefined,
): UsageTurn | undefined {
  if (event.inputTokens === undefined || event.outputTokens === undefined) {
    return undefined
  }
  return {
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    cacheCreationInputTokens: event.cacheCreationInputTokens ?? 0,
    cacheReadInputTokens: event.cacheReadInputTokens ?? 0,
    pricing: model?.pricing ?? null,
  }
}
