import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import type {
  ConversationStateSnapshot,
  GenericMessage,
} from '../../shared/types'
import { validateToken, computeStateHash, verifyStateHash } from './security'

// ============================================================================
// validateToken
// ============================================================================

describe('validateToken', () => {
  const SECRET = 's3cr3t'

  function makeToken(timestamp: number, secret = SECRET): string {
    const hmac = createHmac('sha256', secret)
      .update(String(timestamp))
      .digest('hex')
    return `${timestamp}:${hmac}`
  }

  it('accepts a fresh, correctly-signed token', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(validateToken(makeToken(now), SECRET)).toBe(true)
  })

  it('rejects an expired token', () => {
    const stale = Math.floor(Date.now() / 1000) - 301
    expect(validateToken(makeToken(stale), SECRET)).toBe(false)
  })

  it('rejects a token signed with a different secret', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(validateToken(makeToken(now, 'other'), SECRET)).toBe(false)
  })

  it('rejects an empty secret, empty token, or malformed token', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(validateToken(makeToken(now), '')).toBe(false)
    expect(validateToken('', SECRET)).toBe(false)
    expect(validateToken('no-colon', SECRET)).toBe(false)
    expect(validateToken('notanumber:abcd', SECRET)).toBe(false)
  })
})

// ============================================================================
// computeStateHash / verifyStateHash
// ============================================================================

describe('verifyStateHash', () => {
  function snapshot(secret: string): ConversationStateSnapshot {
    const messages: GenericMessage[] = [{ role: 'user', content: 'hi' }]
    const activatedLazyTools: string[] = ['some_tool']
    return {
      messages,
      activatedLazyTools,
      hash: computeStateHash(messages, activatedLazyTools, secret),
    }
  }

  it('verifies a snapshot hashed with the same non-empty secret', () => {
    expect(verifyStateHash(snapshot('s3cr3t'), 's3cr3t')).toBe(true)
  })

  it('rejects a snapshot hashed with a different secret', () => {
    expect(verifyStateHash(snapshot('s3cr3t'), 'other')).toBe(false)
  })

  it('rejects when the secret is empty even if hashes match', () => {
    // authSecret defaults to '' when unconfigured. The token path guards this,
    // but the state-hash path must too — otherwise forged state verifies.
    expect(verifyStateHash(snapshot(''), '')).toBe(false)
  })
})
