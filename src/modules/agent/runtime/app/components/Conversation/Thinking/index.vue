<template>
  <div class="bk-agent-message bk-is-assistant bk-agent-assistant-bubble">
    <div class="flex gap-8 items-center text-sm">
      <Icon name="loader" class="size-20 text-mono-700" />
      <span>{{ $t('aiAgentThinking', 'Thinking', { more: true }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'
import { useBlokkli } from '#imports'

const { $t } = useBlokkli()
</script>
