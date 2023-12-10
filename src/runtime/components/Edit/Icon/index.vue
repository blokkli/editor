<template>
  <div class="bk-icon" v-html="markup" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { icons } from '#blokkli/icons'
import type { BlokkliIcon } from '#blokkli/icons'

const props = defineProps<{
  name: BlokkliIcon
}>()

const markup = computed(() => icons[props.name])
</script>
