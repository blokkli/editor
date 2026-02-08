<template>
  <div class="bk-agent-error-bubble">
    <Icon name="bk_mdi_priority_high" />
    <span>{{ $t('aiAgentUnknownMessage', 'Unknown message type') }}</span>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  id: string
  timestamp: number
  type: 'unknown'
}>()

const { $t } = useBlokkli()
</script>
