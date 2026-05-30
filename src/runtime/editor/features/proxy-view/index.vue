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
  label: $t('proxyViewToggle', 'Toggle structure view'),
  titleOn: $t('proxyViewShow', 'Show structure view'),
  titleOff: $t('proxyViewHide', 'Show content preview'),
  tourText: $t(
    'proxyViewTourText',
    'Displays the content blocks as a structured view.',
  ),
  icon: 'bk_mdi_account_tree',
  keyCode: 'P',
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
