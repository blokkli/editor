<template>
  <PluginViewOption
    id="fieldAreas"
    :title-on="$t('fieldAreasShow')"
    :title-off="$t('fieldAreasHide')"
    key-code="I"
  >
    <template #icon>
      <Icon name="area" />
    </template>

    <template #default="{ isActive }">
      <Teleport v-if="isActive" to="body">
        <Overlay />
      </Teleport>
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import Overlay from './Overlay/index.vue'
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

defineBlokkliFeature({
  id: 'field-areas',
  description: 'Provides a view option to render the field areas with labels.',
})

const { $t } = useBlokkli()
</script>

<script lang="ts">
export default {
  name: 'FieldAreas',
}
</script>
