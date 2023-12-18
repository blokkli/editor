<template>
  <ArtboardManager v-if="useArtboard && !ui.isMobile.value" />
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'

import ArtboardManager from './Manager/index.vue'

const { storage, ui } = useBlokkli()

const useArtboard = storage.use('useArtboard', true)
</script>

<script lang="ts">
export default {
  name: 'Artboard',
}
</script>
