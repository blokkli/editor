<template>
  <PluginViewOption
    id="grid"
    :title-on="text('gridShow')"
    :title-off="text('gridHide')"
    key-code="G"
  >
    <template #icon>
      <Icon name="grid" />
    </template>

    <template #default="{ isActive }">
      <div
        v-if="isActive"
        class="bk-grid-overlay"
        v-html="runtimeConfig.gridMarkup"
      />
    </template>
  </PluginViewOption>
</template>

<script lang="ts" setup>
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { runtimeConfig, text } = useBlokkli()
</script>
