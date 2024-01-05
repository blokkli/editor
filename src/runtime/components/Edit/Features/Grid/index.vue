<template>
  <PluginViewOption
    id="grid"
    :label="$t('gridToggle')"
    v-slot="{ isActive }"
    :title-on="$t('gridShow')"
    :title-off="$t('gridHide')"
    key-code="G"
    icon="grid"
  >
    <div v-if="isActive" class="bk-grid-overlay" v-html="gridMarkup" />
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'

const { adapter } = defineBlokkliFeature({
  id: 'grid',
  label: 'Grid',
  icon: 'grid',
  requiredAdapterMethods: ['getGridMarkup'],
  description: 'Provides a view option to render a grid.',
  viewports: ['desktop'],
})

const gridMarkup = await Promise.resolve(adapter.getGridMarkup())

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Grid',
}
</script>
