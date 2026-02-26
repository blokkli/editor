<template>
  <div class="bk-diff-value bk-diff-markup-style" v-html="diffHtml" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import diff from 'html-diff-ts'

const MAX_CHANGES = 9999999

const props = defineProps<{
  before: string
  after: string
}>()

const diffResult = computed(() => {
  return diff(props.before, props.after)
})

const diffHtml = computed(() => {
  const result = diffResult.value

  // Count the number of <ins> and <del> segments in the diff output.
  // When there are too many, the interleaved result becomes unreadable
  // (e.g. a full translation). Fall back to showing before/after cleanly.
  const changes =
    (result.match(/<ins[\s>]/g)?.length || 0) +
    (result.match(/<del[\s>]/g)?.length || 0)

  if (changes > MAX_CHANGES) {
    return `<div class="bk-is-clipped"><del>${props.before}</del><ins>${props.after}</ins></div>`
  }

  return result
})
</script>
