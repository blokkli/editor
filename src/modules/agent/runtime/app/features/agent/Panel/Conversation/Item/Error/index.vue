<template>
  <div class="bk-agent-error-bubble">
    <Icon name="bk_mdi_priority_high" />
    <span>{{ errorMessage }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
const props = defineProps<{
  id: string
  timestamp: number
  type: 'error'
  errorType:
    | 'authentication'
    | 'rate_limit'
    | 'overloaded'
    | 'not_found'
    | 'bad_request'
    | 'connection'
    | 'unauthorized'
    | 'unknown'
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
