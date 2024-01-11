<template>
  <PluginViewOption
    id="fieldAreas"
    v-slot="{ isActive }"
    :label="$t('fieldAreasToggle', 'Toggle content areas')"
    :title-on="$t('fieldAreasShow', 'Show content areas')"
    :title-off="$t('fieldAreasHide', 'Hide content areas')"
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
