<template>
  <PluginViewOption
    id="fieldAreas"
    title-on="Inhaltsbereiche anzeigen"
    title-off="Inhaltsbereiche verstecken"
    key-code="I"
  >
    <template #icon>
      <Icon />
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
import PluginViewOption from './../../Plugin/ViewOption/index.vue'
import Icon from './../../Icons/Area.vue'
</script>
