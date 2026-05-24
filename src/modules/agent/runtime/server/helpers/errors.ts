import type { AgentErrorType } from '../../shared/types'

/**
 * Classify an API error into a structured error with type, message, and detail.
 * Works with both Anthropic and OpenAI SDK errors (both use HTTP status codes).
 */
export function classifyError(error: unknown): {
  errorType: AgentErrorType
  message: string
  detail?: string
} {
  if (!(error instanceof Error)) {
    return {
      errorType: 'unknown',
      message: 'An unexpected error occurred.',
    }
  }

  const detail = error.message || undefined

  // Both Anthropic and OpenAI SDK APIError classes expose .status
  const status = (error as Error & { status?: number }).status

  // Connection errors have no status (e.g. APIConnectionError in both SDKs)
  if (status === undefined) {
    if (error.constructor.name === 'APIConnectionError') {
      return {
        errorType: 'connection',
        message: 'Could not connect to the AI service.',
        detail,
      }
    }
    return {
      errorType: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      detail,
    }
  }

  // Map by HTTP status code (works for both Anthropic and OpenAI)
  switch (status) {
    case 401:
      return {
        errorType: 'authentication',
        message: 'API authentication failed. Please check your API key.',
        detail,
      }
    case 400:
      return {
        errorType: 'bad_request',
        message: 'The request to the AI service was invalid.',
        detail,
      }
    case 404:
      return {
        errorType: 'not_found',
        message:
          'The configured AI model was not found. Please check the configuration.',
        detail,
      }
    case 429:
      return {
        errorType: 'rate_limit',
        message:
          'Rate limit exceeded. Please wait a moment before trying again.',
        detail,
      }
    case 529:
    case 503:
      return {
        errorType: 'overloaded',
        message:
          'The AI service is currently overloaded. Please try again in a moment.',
        detail,
      }
    default:
      return {
        errorType: 'unknown',
        message: `API error (${status}).`,
        detail,
      }
  }
}
