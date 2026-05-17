<template>
  <PluginSidebar
    id="diff"
    :title="$t('changes', 'Changes')"
    :tour-text="
      $t('diffSidebarTourText', 'Displays all the changes made during editing.')
    "
    icon="bk_mdi_text_compare"
    weight="-400"
    beta
  >
    <DiffView :key="state.currentMutationIndex.value" />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'

const DiffView = defineAsyncComponent(() => import('./DiffView/index.vue'))

defineBlokkliFeature({
  id: 'diff',
  label: 'Diff',
  icon: 'bk_mdi_text_compare',
  description: 'Displays a diff of all changes in the edit state.',
  requiredAdapterMethods: ['loadStateAtIndex'],
  beta: true,
})

const { $t, state } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Diff',
}
</script>
