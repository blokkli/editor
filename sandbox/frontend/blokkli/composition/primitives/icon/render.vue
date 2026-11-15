<template>
  <SpriteSymbol :name="name as any" class="shrink-0" />
</template>

<script lang="ts" setup>
import { SpriteSymbol } from '#components'

defineProps<{ name: string }>()
</script>
