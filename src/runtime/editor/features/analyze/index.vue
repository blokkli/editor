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
    <template #default="{ isShown, shouldRender }">
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
        v-else-if="!ui.isTransforming.value"
        :key="animation.renderKey.value"
        v-model="isRunning"
        v-model:issue-count="issueCount"
        v-model:has-violation="hasViolation"
        :langcode="context.language"
        :analyze
        :is-shown
        :should-render
      />
    </template>
    <template v-if="issueCount" #badge>
      <div
        class="bk-sidebar-badge"
        :class="hasViolation ? 'bk-is-red' : 'bk-is-yellow'"
      >
        {{ issueCount }}
      </div>
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
  description: 'Analyze blocks and page for SEO, accessibility, etc.',
  viewports: [],
})

const { $t, context, animation, ui, analyze } = useBlokkli()

const isRunning = ref(false)
const issueCount = ref(0)
const hasViolation = ref(false)
</script>

<script lang="ts">
export default {
  name: 'Analyze',
}
</script>

<style lang="postcss">
.bk-is-analyzing {
  .bk,
  .bk-sidebar {
    @apply !hidden;
  }
}
</style>
