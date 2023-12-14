<template>
  <PluginMenuButton
    :title="text('exitTitle')"
    :description="text('exitDescription')"
    :weight="100"
    @click="onClick"
  >
    <Icon name="exit" />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
import { useBlokkli, useRoute, nextTick } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'

const { text } = useBlokkli()

const route = useRoute()

function onClick() {
  nextTick(() => {
    window.location.href = route.path
  })
}
</script>

<script lang="ts">
export default {
  name: 'Exit',
}
</script>
