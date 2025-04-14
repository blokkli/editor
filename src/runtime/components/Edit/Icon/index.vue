<template>
  <div class="bk-icon" :class="'bk-icon-' + name" v-html="markup" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { icons } from '#blokkli-build/icons'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  name: BlokkliIcon
}>()

const markup = computed(() => icons[props.name])
</script>

<script lang="ts">
export default {
  name: 'Icon',
}
</script>
