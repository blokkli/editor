<template>
  <div class="pb-icon" v-html="markup" />
</template>

<script lang="ts" setup>
import { icons, PbIcon } from '#blokkli/icons'

const props = defineProps<{
  name: PbIcon
}>()

const markup = computed(() => icons[props.name])
</script>
