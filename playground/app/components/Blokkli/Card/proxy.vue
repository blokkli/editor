<template>
  <div>
    <h3 v-blokkli-editable:title class="font-bold" v-text="title" />
    <p v-blokkli-editable:text class="text-base" v-text="text" />
  </div>
</template>

<script lang="ts" setup>
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'

type Props = {
  icon?: NuxtSvgSpriteSymbol
  title: string
  text: string
}

defineProps<Props>()
</script>
