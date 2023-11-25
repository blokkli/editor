<template>
  <div class="pb-icon" v-html="markup" />
</template>

<script lang="ts" setup>
import { icons, PbIcon } from '#pb/icons'

const props = defineProps<{
  name: PbIcon
}>()

const markup = computed(() => icons[props.name])
</script>
