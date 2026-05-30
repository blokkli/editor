<template>
  <div />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, watch } from '#imports'
import { defineViewOption } from '#blokkli/editor/composables'

defineBlokkliFeature({
  id: 'proxy_view',
  label: 'Proxy View',
  icon: 'bk_mdi_account_tree',
  description: 'Displays the blocks as a structure in the preview.',
  viewports: ['desktop'],
})

const { $t, ui, eventBus } = useBlokkli()

const { isVisible } = defineViewOption({
  id: 'proxy_view',
  label: $t('viewOptionStructureView', 'Structure view'),
  description: $t(
    'viewOptionStructureViewDescription',
    'Shows blocks as a structured outline instead of the rendered preview.',
  ),
  tourText: $t(
    'proxyViewTourText',
    'Displays the content blocks as a structured view.',
  ),
  icon: 'bk_mdi_account_tree',
})

watch(
  isVisible,
  (v) => {
    ui.isProxyMode.value = v
    eventBus.emit('state:reloaded')
  },
  { immediate: true },
)
</script>

<script lang="ts">
export default {
  name: 'ProxyView',
}
</script>
