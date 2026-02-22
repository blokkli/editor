<template>
  <button class="bk-dropdown-menu-item" @click="$emit('click')" :disabled>
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
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>
