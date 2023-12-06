<template>
  <PluginMenuButton
    :title="text('exitTitle')"
    :description="text('exitDescription')"
    @click="onClick"
    :weight="100"
  >
    <Icon name="exit" />
  </PluginMenuButton>
</template>

<script lang="ts" setup>
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
