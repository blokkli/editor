<template>
  <PluginViewOption
    id="grid"
    :title-on="text('gridShow')"
    :title-off="text('gridHide')"
    key-code="G"
  >
    <template #icon>
      <Icon name="grid" />
    </template>

    <template #default="{ isActive }">
      <div v-if="isActive" class="bk-grid-overlay" v-html="gridMarkup" />
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const adapter = defineBlokkliFeature({
  requiredAdapterMethods: ['getGridMarkup'],
  description: 'Provides a view option to render a grid.',
})

const gridMarkup = await Promise.resolve(adapter.getGridMarkup())

const { text } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'Grid',
}
</script>
