<template>
  <section class="bk-debug-section">
    <h2 class="bk-debug-section-header" @click="toggle">
      <span class="bk-debug-section-indicator">{{ isOpen ? '▼' : '▶' }}</span>
      {{ title }}
    </h2>
    <div v-if="isOpen" class="bk-debug-section-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'

const props = defineProps<{
  title: string
  defaultOpen?: boolean
}>()

const { storage } = useBlokkli()

const isOpen = storage.use('debugSection' + props.title, false)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>
