<template>
  <PluginViewOption
    id="fieldAreas"
    v-slot="{ isActive }"
    :label="$t('fieldAreasToggle', 'Toggle block fields')"
    :title-on="$t('fieldAreasShow', 'Show block fields')"
    :title-off="$t('fieldAreasHide', 'Hide block fields')"
    :tour-text="
      $t(
        'fieldAreasTourText',
        'Toggle between showing or hiding the areas where blocks can be placed.',
      )
    "
    icon="area"
    key-code="I"
  >
    <Teleport v-if="isActive" to="body">
      <Overlay />
    </Teleport>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import Overlay from './Overlay/index.vue'
import { PluginViewOption } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'field-areas',
  label: 'Field Areas',
  icon: 'area',
  description: 'Provides a view option to render the field areas with labels.',
  viewports: ['desktop'],
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'FieldAreas',
}
</script>
