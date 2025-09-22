<template>
  <PluginSidebar
    id="analyze"
    :title="$t('analyzeSidebarTitle', 'Analyze')"
    :tour-text="$t('analyzeTourText', 'Analyze the content of your page')"
    icon="speedometer"
  >
    <Renderer :langcode="context.language" :analyzers />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import Renderer from './Renderer.vue'
import type { Analyzer } from './types'

const { adapter } = defineBlokkliFeature({
  id: 'analyze',
  label: 'Analyze',
  icon: 'speedometer',
  requiredAdapterMethods: ['getAnalyzers'],
  description: 'Analyze blocks and page for SEO, accessibility, etc.',
  viewports: [],
})

function getAdapterAnalyzers(): Promise<Analyzer[]> {
  const result = adapter.getAnalyzers()
  if (Array.isArray(result)) {
    return Promise.resolve(result)
  }
  return Promise.resolve(result).then((result) => {
    if (Array.isArray(result)) {
      return result
    }

    return [result]
  })
}

const analyzers = await getAdapterAnalyzers()

const { $t, context } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Analyze',
}
</script>
