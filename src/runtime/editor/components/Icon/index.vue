<template>
  <div class="bk-icon" :class="'bk-icon-' + name" v-html="markup" />
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = defineProps<{
  name: BlokkliIcon
}>()

const app = useBlokkli(true)

const markup = computed<string>(() =>
  (app?.icons.icons.value[props.name] ?? '')
    .replace('width="48"', '')
    .replace('height="48"', ''),
)
</script>

<script lang="ts">
export default {
  name: 'Icon',
}
</script>
