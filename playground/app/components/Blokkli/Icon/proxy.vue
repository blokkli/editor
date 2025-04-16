<template>
  <div>
    <SpriteSymbol :name="icon" class="size-30" />
  </div>
</template>

<script lang="ts" setup>
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'

defineProps<{
  icon: NuxtSvgSpriteSymbol
}>()
</script>
