<template>
  <PluginSidebar
    id="structure"
    :title="text('structureToolbarLabel')"
    edit-only
    icon="tree"
  >
    <List />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { PluginSidebar } from '#blokkli/plugins'
import List from './List/index.vue'

const { text } = useBlokkli()
</script>
