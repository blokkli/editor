<template>
  <ErrorBubble :text="$t('aiAgentUnknownMessage', 'Unknown message type')" />
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import ErrorBubble from '../ErrorBubble/index.vue'

defineProps<{
  id: string
  timestamp: number
  type: 'unknown'
}>()

const { $t } = useBlokkli()
</script>
