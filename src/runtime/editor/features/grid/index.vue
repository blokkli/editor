<template>
  <div v-if="isVisible" class="bk-grid-overlay" v-html="gridMarkup" />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { defineViewOption } from '#blokkli/editor/composables'

const { adapter } = defineBlokkliFeature({
  id: 'grid',
  label: 'Grid',
  icon: 'bk_mdi_grid_view',
  requiredAdapterMethods: ['getGridMarkup'],
  description: 'Provides a view option to render a grid.',
  viewports: ['desktop'],
})

const gridMarkup = await Promise.resolve(adapter.getGridMarkup())

const { $t } = useBlokkli()

const { isVisible } = defineViewOption({
  id: 'grid',
  label: $t('viewOptionGrid', 'Grid'),
  description: $t(
    'viewOptionGridDescription',
    'Shows a layout grid overlay on top of the page.',
  ),
  tourText: $t(
    'gridTourText',
    'Display a layout grid overlay on top of the page.',
  ),
  keyCode: 'G',
  icon: 'bk_mdi_grid_view',
})
</script>

<script lang="ts">
export default {
  name: 'Grid',
}
</script>
