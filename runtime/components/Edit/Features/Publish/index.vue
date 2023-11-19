<template>
  <PluginMenuButton
    title="Veröffentlichen"
    description="Alle Änderungen öffentlich machen"
    @click="eventBus.emit('publish')"
    :disabled="!mutations.length || !canEdit"
    type="success"
  >
    <Icon />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import Icon from './../../Icons/Publish.vue'

const { eventBus, mutations, canEdit } = useParagraphsBuilderStore()
</script>
