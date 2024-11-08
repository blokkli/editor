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
    icon="tree"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'proxy_view',
  label: 'Proxy View',
  icon: 'tree',
  description: 'Displays the blocks as a structure in the preview.',
  viewports: ['desktop'],
})

const { $t, ui } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'ProxyView',
}
</script>
