<template>
  <PluginSidebar
    id="theme"
    :title="$t('theme', 'Theme')"
    icon="palette"
    weight="-100"
  >
    <div class="bk bk-theme-editor bk-control" @wheel.capture.stop>
      <div class="bk-theme-editor-groups">
        <div v-for="group in groups" :key="group" class="bk-theme-editor-group">
          <h2>{{ group }}</h2>
          <table class="bk-theme-editor-table">
            <Color
              v-for="shade in shades"
              :key="group + shade"
              :group="group"
              :shade="shade"
            />
          </table>
        </div>
      </div>

      <GeneratedCode />
    </div>
  </PluginSidebar>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginSidebar } from '#blokkli/plugins'
import Color from './Color/index.vue'
import GeneratedCode from './GeneratedCode/index.vue'
import type { ThemeColorGroup, ThemeColorShade } from '#blokkli/types'

defineBlokkliFeature({
  id: 'theme',
  icon: 'palette',
  label: 'Theme',
  description: 'Implements a theme editor.',
})

const groups: ThemeColorGroup[] = ['accent', 'mono']
const shades: ThemeColorShade[] = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
]

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Theme',
}
</script>
