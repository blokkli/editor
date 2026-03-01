<template>
  <div class="bk-diff-value bk-diff-markup-style" v-html="diffHtml" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { computeDiff } from '#blokkli/editor/helpers/diff'

const props = defineProps<{
  before: string
  after: string
}>()

const diffHtml = computed(() => {
  return computeDiff(props.before, props.after)
})
</script>
