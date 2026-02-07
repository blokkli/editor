<template>
  <div class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble">
    <div class="bk-agent-thinking">
      <Icon name="loader" />
      <span>{{ $t('aiAgentThinking', 'Thinking...') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'
import { useBlokkli } from '#imports'

const { $t } = useBlokkli()
</script>
