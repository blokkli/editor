<template>
  <div
    ref="el"
    class="mt-5 text-sm text-red-normal"
    data-test="translations-row-error"
  >
    {{ message }}
  </div>
</template>

<script lang="ts" setup>
import { onMounted, useTemplateRef } from '#imports'

const props = defineProps<{
  /** What the backend said about the text of the row. */
  message: string
  /** Bring the row into view when the message appears. */
  reveal?: boolean
}>()

const el = useTemplateRef('el')

onMounted(() => {
  if (props.reveal) {
    el.value?.scrollIntoView({ block: 'nearest' })
  }
})
</script>
