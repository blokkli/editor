<template>
  <Renderer v-if="debug.isEnabled.value" :logger />
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { defineBlokkliFeature, useBlokkli } from '#imports'
import Renderer from './Renderer.vue'

const { logger } = defineBlokkliFeature({
  id: 'debug',
  label: 'Debug',
  icon: 'bug',
  description: 'Provides debugging functionality.',
})

const { debug } = useBlokkli()

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    debug.toggle()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
</script>
