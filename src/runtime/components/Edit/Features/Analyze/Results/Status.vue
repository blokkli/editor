<template>
  <div
    class="bk-pill bk-analyze-status"
    :class="'bk-is-' + (status ?? 'inapplicable')"
  >
    {{ label }}
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { AnalyzeStatus } from '../types'

const props = defineProps<{
  status?: AnalyzeStatus
}>()

const label = computed(() => {
  if (props.status === 'pass') {
    return 'Pass'
  } else if (props.status === 'incomplete') {
    return 'Incomplete'
  } else if (props.status === 'violation') {
    return 'Violation'
  }

  return 'Inapplicable'
})
</script>
