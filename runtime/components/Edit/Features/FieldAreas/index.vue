<template>
  <PluginViewOption
    id="fieldAreas"
    :title-on="text('fieldAreasShow')"
    :title-off="text('fieldAreasHide')"
    key-code="I"
  >
    <template #icon>
      <Icon name="area" />
    </template>

    <template v-slot="{ isActive }">
      <Teleport v-if="isActive" to="body">
        <Overlay />
      </Teleport>
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import Overlay from './Overlay/index.vue'
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { text } = useBlokkli()
</script>
