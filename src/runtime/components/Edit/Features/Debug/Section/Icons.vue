<template>
  <div class="bk-debug-icons">
    <div v-for="icon in iconItems" :key="icon">
      <Icon :name="icon" />
      <p>{{ icon }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { Icon } from '#blokkli/components'
import { icons, type BlokkliIcon } from '#blokkli-build/icons'

const iconItems = computed(() => Object.keys(icons) as BlokkliIcon[])
</script>
