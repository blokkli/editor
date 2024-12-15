<template>
  <div class="bk-info-box">
    <Icon name="info" />
    <p v-html="text" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'

defineProps<{
  text: string
}>()
</script>
