<template>
  <PluginSidebar
    id="structure"
    :title="$t('structureToolbarLabel', 'Structure')"
    :tour-text="
      $t(
        'structureTourText',
        'Shows a structured list of all blocks on the current page. Click on any block to quickly jump to it.',
      )
    "
    edit-only
    icon="tree"
    weight="-90"
  >
    <div class="bk bk-structure bk-control" @wheel.stop>
      <List :fields="fields" :entity-bundle="context.entityBundle" />
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import List from './ListNew/index.vue'

defineBlokkliFeature({
  id: 'structure',
  icon: 'tree',
  label: 'Structure',
  description:
    'Provides a sidebar button to render a structured list of all blocks on the current page.',
})

const { $t, state, runtimeConfig, context } = useBlokkli()

const fields = computed(() => {
  return state.mutatedFields.value.filter(
    (v) => v.entityType !== runtimeConfig.itemEntityType,
  )
})
</script>

<script lang="ts">
export default {
  name: 'Structure',
}
</script>
