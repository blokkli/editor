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
  label: $t('viewOptionAnchors', 'Anchor links'),
  description: $t(
    'viewOptionAnchorsDescription',
    'Highlights blocks that have an anchor ID.',
  ),
  icon: 'bk_mdi_anchor',
  default: true,
})
</script>

<script lang="ts">
export default {
  name: 'Anchors',
}
</script>
