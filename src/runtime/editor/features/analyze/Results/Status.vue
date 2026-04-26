<template>
  <Pill :text="label" :scheme variant="normal" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { useAnalyzeHelper } from '../helper'
import type { AnalyzeStatus } from '../analyzers/types'
import { Pill } from '#blokkli/editor/components'
import type { ThemeColorName } from '../../../../../global/types/theme'

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

const scheme = computed<ThemeColorName>(() => {
  if (props.status === 'inapplicable') {
    return 'mono'
  } else if (props.status === 'incomplete') {
    return 'yellow'
  } else if (props.status === 'violation') {
    return 'red'
  }

  return 'lime'
})
</script>
