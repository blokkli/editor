<template>
  <PluginSidebar
    id="structure"
    :title="text('structureToolbarLabel')"
    edit-only
    icon="tree"
    weight="-90"
  >
    <List :key="listRefreshKey" />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import List from './List/index.vue'

const { text, state, ui } = useBlokkli()

const targetNode = ui.providerElement()

const listRefreshKey = ref(state.refreshKey.value)

const observer = new MutationObserver(() => {
  if (listRefreshKey.value === state.refreshKey.value) {
    return
  }
  listRefreshKey.value = state.refreshKey.value
})

onMounted(() => {
  observer.observe(targetNode, {
    childList: true,
    subtree: true,
    attributes: false,
  })
})

onBeforeUnmount(() => {
  observer.disconnect()
})
</script>

<script lang="ts">
export default {
  name: 'Structure',
}
</script>
