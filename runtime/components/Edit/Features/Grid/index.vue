<template>
  <PluginViewOption
    id="grid"
    title-on="Grid anzeigen"
    title-off="Grid verstecken"
    key-code="G"
  >
    <template #icon>
      <IconGrid />
    </template>

    <template v-slot="{ isActive }">
      <div
        v-if="isActive"
        class="pb-grid-overlay"
        v-html="runtimeConfig.gridMarkup"
      />
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import PluginViewOption from './../../Plugin/ViewOption/index.vue'
import IconGrid from './../../Icons/Grid.vue'

const { runtimeConfig } = useParagraphsBuilderStore()
</script>
