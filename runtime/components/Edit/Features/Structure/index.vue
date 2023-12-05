<template>
  <PluginSidebar id="structure" title="Struktur" edit-only icon="tree">
    <List />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { PluginSidebar } from '#blokkli/plugins'
import List from './List/index.vue'
</script>
