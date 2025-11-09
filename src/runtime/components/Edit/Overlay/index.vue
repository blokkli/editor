<template>
  <BlokkliTransition name="fade">
    <div
      v-if="isVisible"
      class="bk bk-overlay"
      @click.prevent.stop.capture
      @wheel.capture.stop.prevent
      @pointerdown.capture.stop.prevent
      @pointermove.capture.stop.prevent
      @touchstart.capture.stop.prevent
      @touchmove.capture.stop.prevent
      @touchend.capture.stop.prevent
    />
  </BlokkliTransition>
</template>

<script setup lang="ts">
import { BlokkliTransition } from '#blokkli/components'
import { computed, useBlokkli } from '#imports'

const { ui } = useBlokkli()

const isVisible = computed(() => ui.hasDialogOpen.value)
</script>
