<template>
  <PluginMenuButton
    :title="$t('exitTitle')"
    :description="$t('exitDescription')"
    :weight="100"
    icon="exit"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, useRoute, nextTick, defineBlokkliFeature } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'exit',
  label: 'Exit',
  icon: 'exit',
  description: 'Provides a menu button to exit the editor without saving.',
})

const { $t } = useBlokkli()

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
