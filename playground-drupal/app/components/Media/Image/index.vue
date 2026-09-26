<template>
  <img
    v-if="image?.derivative?.urlPath"
    :src="image.derivative.urlPath"
    :width="image.derivative.width ?? undefined"
    :height="image.derivative.height ?? undefined"
    :alt="image.alt ?? ''"
    loading="lazy"
  />
</template>

<script lang="ts" setup>
import type { MediaImageFragment } from '#graphql-operations'

defineProps<MediaImageFragment>()
</script>
