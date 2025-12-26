<template>
  <div class="bk-debug-list">
    <div>
      <div>Space</div>
      <div>{{ keyboard.isPressingSpace.value }}</div>
    </div>
    <div>
      <div>Control</div>
      <div>{{ keyboard.isPressingControl.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'

const { keyboard } = useBlokkli()
</script>
