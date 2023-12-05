<template>
  <div class="bk-icon" v-html="markup" />
</template>

<script lang="ts" setup>
import { icons, BlokkliIcon } from '#blokkli/icons'

const props = defineProps<{
  name: BlokkliIcon
}>()

const markup = computed(() => icons[props.name])
</script>
