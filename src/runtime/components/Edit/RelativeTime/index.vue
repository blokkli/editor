<template>
  <slot :formatted="formatted" />
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, useBlokkli } from '#imports'
import { getRelativeTimeString } from '#blokkli/helpers'

const props = defineProps<{
  timestamp: number
}>()

const { ui } = useBlokkli()

const incrementToggle = ref(0)
let interval: any = null

const formatted = computed(() => {
  // Adding the toggle value forces an update every 5 seconds, so the relative time stays correct.
  const date = new Date(props.timestamp * 1000 + incrementToggle.value)
  return getRelativeTimeString(date, ui.interfaceLanguage.value)
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

<script lang="ts">
export default {
  name: 'RelativeTime',
}
</script>
