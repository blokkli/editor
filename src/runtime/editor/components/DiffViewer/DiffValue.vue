<template>
  <div class="bk-diff-value bk-diff-markup-style" v-html="diffHtml" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { computeDiff } from '#blokkli/editor/helpers/diff'

const props = defineProps<{
  before: string
  after: string
  afterOnly?: boolean
}>()

const diffHtml = computed(() => {
  if (props.afterOnly) {
    return '<ins>' + props.after + '</ins>'
  }
  return computeDiff(props.before, props.after)
})
</script>
