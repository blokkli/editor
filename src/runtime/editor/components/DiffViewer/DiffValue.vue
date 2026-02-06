<template>
  <div class="bk-diff-value" v-html="diffHtml" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import diff from 'html-diff-ts'

const MAX_CHANGES = 6

const props = defineProps<{
  before: string
  after: string
}>()

const diffHtml = computed(() => {
  const result = diff(props.before, props.after)

  // Count the number of <ins> and <del> segments in the diff output.
  // When there are too many, the interleaved result becomes unreadable
  // (e.g. a full translation). Fall back to showing before/after cleanly.
  const changes =
    (result.match(/<ins[\s>]/g)?.length || 0) +
    (result.match(/<del[\s>]/g)?.length || 0)

  if (changes > MAX_CHANGES) {
    return `<del>${props.before}</del><ins>${props.after}</ins>`
  }

  return result
})
</script>
