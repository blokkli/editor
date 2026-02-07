<template>
  <div class="bk-agent-error-bubble">
    <Icon name="bk_mdi_priority_high" />
    <span>{{ errorMessage }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { ErrorConversationItem } from '#blokkli/agent/app/types'

const props = defineProps<ErrorConversationItem>()

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
    default:
      return $t('aiAgentErrorUnknown', 'An unexpected error occurred.')
  }
})
</script>
