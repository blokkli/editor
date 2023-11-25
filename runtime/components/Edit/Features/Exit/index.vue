<template>
  <PluginMenuButton
    title="Schliessen"
    description="Editor schliessen ohne veröffentlichen"
    @click="eventBus.emit('exitEditor')"
    :weight="100"
  >
    <Icon name="exit" />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import { PluginMenuButton } from '#pb/plugins'
import { Icon } from '#pb/components'

const { eventBus } = useParagraphsBuilderStore()
</script>
