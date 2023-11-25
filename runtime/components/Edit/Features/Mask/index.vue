<template>
  <PluginViewOption
    id="mask"
    title-on="Inhaltsfelder anzeigen"
    title-off="Inhaltsfelder verstecken"
    key-code="M"
  >
    <template #icon>
      <Icon name="texturebox" />
    </template>

    <template v-slot="{ isActive }">
      <Teleport to="body">
        <Overlay v-if="isActive" />
      </Teleport>
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { PluginViewOption } from '#pb/plugins'
import { Icon } from '#pb/components'
import Overlay from './Overlay/index.vue'
</script>
