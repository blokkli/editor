<template>
  <PluginSidebar
    id="analyze"
    :title="$t('analyzeSidebarTitle', 'Analyze')"
    :tour-text="$t('analyzeTourText', 'Analyze the content of your page')"
    icon="bk_mdi_speed"
    weight="10"
    :is-loading="isRunning"
    render-always
  >
    <template #icon>
      <AnalyzeIcon :is-running />
    </template>
    <template #default="{ isShown }">
      <div v-if="ui.isProxyMode.value" class="bk-sidebar-padding bk">
        <InfoBox
          :text="
            $t(
              'analyzeNotAvailableInStructureView',
              'Analyze is not available in structure view.',
            )
          "
          icon="bk_mdi_account_tree"
        />
      </div>
      <AnalyzerMain
        v-else
        :key="animation.renderKey.value"
        v-model="isRunning"
        :langcode="context.language"
        :analyze
        :is-shown
      />
    </template>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { PluginSidebar } from '#blokkli/editor/plugins'
import { InfoBox } from '#blokkli/editor/components'
import AnalyzerMain from './Main.vue'
import AnalyzeIcon from './Icon.vue'

defineBlokkliFeature({
  id: 'analyze',
  label: 'Analyze',
  icon: 'bk_mdi_speed',
  requiredAdapterMethods: ['getAnalyzers'],
  description: 'Analyze blocks and page for SEO, accessibility, etc.',
  viewports: [],
})

const { $t, context, animation, ui, analyze } = useBlokkli()

const isRunning = ref(false)
</script>

<script lang="ts">
export default {
  name: 'Analyze',
}
</script>
