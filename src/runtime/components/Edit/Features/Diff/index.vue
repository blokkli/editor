<template>
  <PluginSidebar
    id="diff"
    :title="$t('diffSidebarTitle', 'Diff')"
    :tour-text="$t('diffSidebarTourText', 'Displays all the changes made.')"
    icon="diff"
    weight="-100"
  >
    <DiffView />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import DiffView from './DiffView/index.vue'

defineBlokkliFeature({
  id: 'diff',
  label: 'Diff',
  icon: 'diff',
  description: 'Displays a diff of all changes in the edit state.',
  requiredAdapterMethods: ['loadStateAtIndex'],
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Diff',
}
</script>
