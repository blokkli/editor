<template>
  <AnchorOverlay v-if="isVisible" />
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  defineAsyncComponent,
} from '#imports'
import { defineViewOption } from '#blokkli/editor/composables'

const AnchorOverlay = defineAsyncComponent(() => import('./Overlay/index.vue'))

defineBlokkliFeature({
  id: 'anchors',
  label: 'Anchors',
  icon: 'bk_mdi_anchor',
  description: 'Displays indicators for blocks with anchor IDs',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()

const { isVisible } = defineViewOption({
  id: 'anchor',
  label: $t('anchorToggle', 'Toggle anchor links'),
  titleOn: $t('anchorShow', 'Show anchor links'),
  titleOff: $t('anchorHide', 'Hide anchor links'),
  icon: 'bk_mdi_anchor',
})
</script>

<script lang="ts">
export default {
  name: 'Anchors',
}
</script>
