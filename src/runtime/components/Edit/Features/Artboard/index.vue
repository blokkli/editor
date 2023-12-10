<template>
  <ArtboardManager v-if="useArtboard" />
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'

import ArtboardManager from './Manager/index.vue'

const { storage } = useBlokkli()

const useArtboard = storage.use('useArtboard', true)
</script>
