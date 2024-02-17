<template>
  <PluginViewOption
    id="mask"
    v-slot="{ isActive }"
    :label="$t('maskToggle', 'Show content fields')"
    :title-on="$t('maskShow', 'Show content fields')"
    :title-off="$t('maskHide', 'Hide content fields')"
    :tour-text="
      $t(
        'maskTourText',
        'Toggle between showing or hiding non-editable parts of the page.',
      )
    "
    icon="texturebox"
    key-code="M"
  >
    <Teleport to="body">
      <Overlay v-if="isActive" />
    </Teleport>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginViewOption } from '#blokkli/plugins'
import Overlay from './Overlay/index.vue'

defineBlokkliFeature({
  id: 'editable-mask',
  icon: 'texturebox',
  label: 'Editable Mask',
  description: 'Provides a view option to hide non-editable parts of the page.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'EditableMask',
}
</script>
