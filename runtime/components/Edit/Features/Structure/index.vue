<template>
  <PluginSidebar id="structure" title="Struktur" edit-only>
    <template #icon>
      <Icon />
    </template>
    <List />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import Icon from './../../Icons/Tree.vue'
import List from './List/index.vue'
</script>
