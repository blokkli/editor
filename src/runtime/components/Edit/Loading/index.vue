<template>
  <div class="bk bk-loading-overlay" :class="{ 'bk-is-screen': screen }">
    <Icon name="spinner" />
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'

defineProps<{
  screen?: boolean
}>()
</script>

<script lang="ts">
export default {
  name: 'Loading',
}
</script>
