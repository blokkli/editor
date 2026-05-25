import { describe, it, expect } from 'vitest'
import type { AgentModelDefinition } from '../../shared/types'
import { getDefaultModel, createUsageTurn } from './models'

// ============================================================================
// getDefaultModel
// ============================================================================

describe('getDefaultModel', () => {
  const model = (
    name: string,
    extra: Partial<AgentModelDefinition> = {},
  ): AgentModelDefinition => ({ name, label: name, ...extra })

  it('returns the model flagged isDefault', () => {
    const models = [model('a'), model('b', { isDefault: true }), model('c')]
    expect(getDefaultModel(models)?.name).toBe('b')
  })

  it('falls back to the first model when none is flagged', () => {
    const models = [model('a'), model('b')]
    expect(getDefaultModel(models)?.name).toBe('a')
  })

  it('returns undefined for an empty list', () => {
    expect(getDefaultModel([])).toBeUndefined()
  })
})

// ============================================================================
// createUsageTurn
// ============================================================================

describe('createUsageTurn', () => {
  const pricing = { input: 1, cacheWrite: 2, cacheRead: 3, output: 4 }
  const model: AgentModelDefinition = { name: 'm', label: 'm', pricing }

  it('builds a usage turn, defaulting cache fields and pricing', () => {
    expect(
      createUsageTurn({ inputTokens: 10, outputTokens: 5 }, model),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      pricing,
    })
  })

  it('passes through cache fields and null pricing when no model', () => {
    expect(
      createUsageTurn(
        {
          inputTokens: 10,
          outputTokens: 5,
          cacheCreationInputTokens: 2,
          cacheReadInputTokens: 7,
        },
        undefined,
      ),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationInputTokens: 2,
      cacheReadInputTokens: 7,
      pricing: null,
    })
  })

  it('returns undefined when token counts are missing', () => {
    expect(createUsageTurn({ outputTokens: 5 }, model)).toBeUndefined()
    expect(createUsageTurn({ inputTokens: 10 }, model)).toBeUndefined()
  })
})
