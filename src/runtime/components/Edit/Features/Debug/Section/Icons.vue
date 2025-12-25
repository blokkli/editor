<template>
  <div class="bk-debug-icons">
    <div v-for="icon in iconItems" :key="icon">
      <Icon :name="icon" />
      <p>{{ icon }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

const { icons } = useBlokkli()

const iconItems = computed(
  () => Object.keys(icons.icons.value) as BlokkliIcon[],
)
</script>
