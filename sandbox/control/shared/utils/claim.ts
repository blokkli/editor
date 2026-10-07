import type { Language } from '../../../frontend/shared/utils/languages'

/**
 * Why a claim failed: the claim API's error codes, which the claim page shows
 * in its own words.
 */
export const CLAIM_ERRORS = [
  'template',
  'turnstile',
  'rate_limit',
  'full',
  'invitation',
  'failed',
] as const

export type ClaimError = (typeof CLAIM_ERRORS)[number]

export function isClaimError(value: unknown): value is ClaimError {
  return CLAIM_ERRORS.includes(value as ClaimError)
}

// German: the claim page's language, and so the content's, when the browser
// asks for none of the three.
export const DEFAULT_LANGUAGE: Language = 'de'
