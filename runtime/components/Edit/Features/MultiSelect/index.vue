<template>
  <Teleport to="body">
    <Overlay v-if="!keyboard.isPressingSpace.value" />
  </Teleport>
</template>

<script lang="ts" setup>
import Overlay from './Overlay/index.vue'

const { keyboard } = useParagraphsBuilderStore()
</script>
