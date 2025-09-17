<template>
  <PluginSidebar
    id="analyze"
    :title="$t('analyzeSidebarTitle', 'Analyze')"
    :tour-text="$t('analyzeTourText', 'Analyze the content of your page')"
    icon="chart"
  >
    <Renderer :langcode="context.language" />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import Renderer from './Renderer.vue'

defineBlokkliFeature({
  id: 'analyze',
  label: 'Analyze',
  icon: 'chart',
  requiredAdapterMethods: [],
  description: 'Analyze blocks and page for SEO, accessibility, etc.',
  viewports: [],
})

const { $t, context } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Analyze',
}
</script>
