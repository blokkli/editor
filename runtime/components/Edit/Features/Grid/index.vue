<template>
  <PluginViewOption
    id="grid"
    title-on="Grid anzeigen"
    title-off="Grid verstecken"
    key-code="G"
  >
    <template #icon>
      <Icon name="grid" />
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
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { runtimeConfig } = useBlokkli()
</script>
