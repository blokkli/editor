<template>
  <PluginViewOption
    id="mask"
    :title-on="text('maskShow')"
    :title-off="text('maskHide')"
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
import { PluginViewOption } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import Overlay from './Overlay/index.vue'

const { text } = useBlokkli()
</script>
