<template>
  <div
    class="bk-pill bk-analyze-status"
    :class="status === 'inapplicable' ? 'bk-is-mono' : 'bk-is-' + status"
  >
    {{ label }}
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { useAnalyzeHelper } from '../helper'
import type { AnalyzeStatus } from '../types'

const props = withDefaults(
  defineProps<{
    status?: AnalyzeStatus
  }>(),
  {
    status: 'inapplicable',
  },
)

const { getStatusLabel } = useAnalyzeHelper()

const label = computed(() => getStatusLabel(props.status ?? 'inapplicable'))
</script>
