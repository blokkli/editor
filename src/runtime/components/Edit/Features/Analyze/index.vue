<template>
  <PluginSidebar
    id="analyze"
    :title="$t('analyzeSidebarTitle', 'Analyze')"
    :tour-text="$t('analyzeTourText', 'Analyze the content of your page')"
    icon="speedometer"
    :is-loading="isRunning"
  >
    <template #icon>
      <AnalyzeIcon :is-running />
    </template>
    <AnalyzerMain
      :key="animation.renderKey.value"
      v-model="isRunning"
      :langcode="context.language"
      :analyzers
    />
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import AnalyzerMain from './Main.vue'
import type { Analyzer } from './analyzers/types'
import AnalyzeIcon from './Icon.vue'

const { adapter } = defineBlokkliFeature({
  id: 'analyze',
  label: 'Analyze',
  icon: 'speedometer',
  requiredAdapterMethods: ['getAnalyzers'],
  description: 'Analyze blocks and page for SEO, accessibility, etc.',
  viewports: [],
})

const isRunning = ref(false)

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

const { $t, context, animation } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Analyze',
}
</script>
