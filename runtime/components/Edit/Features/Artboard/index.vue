<template>
  <ArtboardManager v-if="useArtboard" />
</template>

<script lang="ts" setup>
import ArtboardManager from './Manager/index.vue'

const { storage } = useParagraphsBuilderStore()

const useArtboard = storage.use('useArtboard', true)
</script>
