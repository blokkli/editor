<template>
  <PluginMenuButton
    title="Schliessen"
    description="Editor schliessen ohne veröffentlichen"
    @click="eventBus.emit('exitEditor')"
    :weight="100"
  >
    <Icon />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Exit.vue'

const { eventBus } = useParagraphsBuilderStore()
</script>
