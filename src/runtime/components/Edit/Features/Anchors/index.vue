<template>
  <PluginViewOption
    id="anchor"
    v-slot="{ isActive }"
    :label="$t('anchorToggle', 'Toggle anchor links')"
    :title-on="$t('anchorShow', 'Show anchor links')"
    :title-off="$t('anchorHide', 'Hide anchor links')"
    icon="anchor"
  >
    <AnchorRenderer v-if="isActive" />
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'
import AnchorRenderer from './Renderer.vue'

defineBlokkliFeature({
  id: 'anchors',
  label: 'Anchors',
  icon: 'anchor',
  description: 'Displays indicators for blocks with anchor IDs',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Anchors',
}
</script>
