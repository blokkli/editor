<template>
  <slot :formatted="formatted" />
</template>

<script lang="ts" setup>
import { getRelativeTimeString } from '#blokkli/helpers'

const props = defineProps<{
  timestamp: number
}>()

const incrementToggle = ref(0)
let interval: any = null

const formatted = computed(() => {
  // Adding the toggle value forces an update every 5 seconds, so the relative time stays correct.
  const date = new Date(props.timestamp * 1000 + incrementToggle.value)
  return getRelativeTimeString(date)
})

onMounted(() => {
  interval = setInterval(() => {
    incrementToggle.value = incrementToggle.value ? 0 : 1
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(interval)
})
</script>
