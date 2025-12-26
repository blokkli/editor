<template>
  <PluginViewOption
    id="proxy_view"
    v-model="ui.isProxyMode.value"
    :label="$t('proxyViewToggle', 'Toggle structure view')"
    :title-on="$t('proxyViewShow', 'Show structure view')"
    :title-off="$t('proxyViewHide', 'Show content preview')"
    :tour-text="
      $t(
        'proxyViewTourText',
        'Displays the content blocks as a structured view.',
      )
    "
    key-code="P"
    icon="bk_mdi_account_tree"
    @update:model-value="onToggleProxyMode"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/editor/plugins'

defineBlokkliFeature({
  id: 'proxy_view',
  label: 'Proxy View',
  icon: 'bk_mdi_account_tree',
  description: 'Displays the blocks as a structure in the preview.',
  viewports: ['desktop'],
})

const { $t, ui, eventBus } = useBlokkli()

function onToggleProxyMode() {
  eventBus.emit('state:reloaded')
}
</script>

<script lang="ts">
export default {
  name: 'ProxyView',
}
</script>
