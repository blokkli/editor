<template>
  <PluginSidebar
    id="structure"
    :title="$t('structureToolbarLabel')"
    edit-only
    icon="tree"
    weight="-90"
  >
    <List :key="listRefreshKey" />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import List from './List/index.vue'

defineBlokkliFeature({
  id: 'structure',
  icon: 'tree',
  label: 'Structure',
  description:
    'Provides a sidebar button to render a structured list of all blocks on the current page.',
})

const { $t, state, ui, selection } = useBlokkli()

const targetNode = ui.providerElement()

const listRefreshKey = ref('')

const observer = new MutationObserver(() => {
  if (
    listRefreshKey.value === state.refreshKey.value ||
    selection.isDragging.value ||
    selection.isMultiSelecting.value ||
    selection.isChangingOptions.value
  ) {
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
