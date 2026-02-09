<template>
  <button @click="$emit('click')">
    <Icon :name="icon" />
    <span>{{ text }}</span>
  </button>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  icon: BlokkliIcon
  text: string
}>()

defineEmits<{
  click: []
}>()
</script>
