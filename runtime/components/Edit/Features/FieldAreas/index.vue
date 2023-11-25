<template>
  <PluginViewOption
    id="fieldAreas"
    title-on="Inhaltsbereiche anzeigen"
    title-off="Inhaltsbereiche verstecken"
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
import { PluginViewOption } from '#pb/plugins'
import { Icon } from '#pb/components'
</script>
