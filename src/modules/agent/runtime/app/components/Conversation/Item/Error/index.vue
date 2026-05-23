<template>
  <ErrorBubble :text="errorMessage" retryable @retry="$emit('retry')" />
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { AgentErrorType } from '#blokkli/agent/shared/types'
import ErrorBubble from '../ErrorBubble/index.vue'

const props = defineProps<{
  id: string
  timestamp: number
  type: 'error'
  errorType: AgentErrorType
  retryable?: boolean
}>()

defineEmits<{
  retry: []
}>()

const { $t } = useBlokkli()

const errorMessage = computed(() => {
  switch (props.errorType) {
    case 'authentication':
      return $t(
        'aiAgentErrorAuthentication',
        'API authentication failed. Please check your API key.',
      )
    case 'rate_limit':
      return $t(
        'aiAgentErrorRateLimit',
        'Rate limit exceeded. Please wait a moment before trying again.',
      )
    case 'overloaded':
      return $t(
        'aiAgentErrorOverloaded',
        'The AI service is currently overloaded. Please try again in a moment.',
      )
    case 'not_found':
      return $t(
        'aiAgentErrorNotFound',
        'The configured AI model was not found. Please check the configuration.',
      )
    case 'bad_request':
      return $t(
        'aiAgentErrorBadRequest',
        'The request to the AI service was invalid.',
      )
    case 'connection':
      return $t(
        'aiAgentErrorConnection',
        'Could not connect to the AI service. Please check your network connection.',
      )
    case 'unauthorized':
      return $t(
        'aiAgentErrorUnauthorized',
        'Authentication failed. Please reload the page and try again.',
      )
    default:
      return $t('aiAgentErrorUnknown', 'An unexpected error occurred.')
  }
})
</script>
