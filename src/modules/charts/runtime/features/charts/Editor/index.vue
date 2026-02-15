<template>
  <div></div>
</template>

<script setup lang="ts">
import { ref, useBlokkli } from '#imports'
import type { BlokkliChartData } from '../../../types'

const props = defineProps<{
  uuid: string
}>()

const { ui, $t, state } = useBlokkli()

function getCurrentData() {
  // @todo later, do some valiation of the provided data.
  const options = state.getFieldListItem(props.uuid)?.options
  if (options?.data) {
    try {
      return JSON.parse(options.data)
    } catch {}
  }

  // Default value.
  return {
    label: '',
  }
}

const data = ref<BlokkliChartData>(getCurrentData())
</script>
