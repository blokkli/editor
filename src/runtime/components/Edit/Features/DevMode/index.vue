<template>
  <PluginViewOption
    id="dev_mode"
    v-model="isEnabled"
    :label="$t('toggleInteractionLayers', 'Toggle interaction layers')"
    :title-on="$t('interactionLayersOn', 'Hide interaction layers')"
    :title-off="$t('interactionLayerOff', 'Show interaction layers')"
    icon="bk_mdi_logo_dev"
    key-code="I"
    weight="-99999"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, ref } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'
import { addElementClasses } from '#blokkli/helpers/composables/addElementClasses'

defineBlokkliFeature({
  id: 'dev-mode',
  label: 'Dev Mode',
  icon: 'bk_mdi_logo_dev',
  description: 'Feature enabled in development mode.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()

const isEnabled = ref(false)

addElementClasses(
  document.documentElement,
  'bk-hide-interaction-layers',
  isEnabled,
)
</script>

<script lang="ts">
export default {
  name: 'DevMode',
}
</script>
