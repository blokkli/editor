<template>
  <Renderer />
</template>

<script lang="ts" setup>
import { defineBlokkliFeature } from '#imports'
import Renderer from './Renderer/index.vue'

defineBlokkliFeature({
  id: 'highlights',
  label: 'Highlights',
  icon: 'bk_mdi_error',
  description:
    'Renders persistent highlights for blocks with issues or outdated translations.',
})
</script>

<script lang="ts">
export default {
  name: 'Highlights',
}
</script>
