import type { Language } from '../../frontend/shared/languages'

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

// German: the claim page's language when the browser asks for none of the
// three, and the preselected language of the content, whatever the page's.
export const DEFAULT_LANGUAGE: Language = 'de'
