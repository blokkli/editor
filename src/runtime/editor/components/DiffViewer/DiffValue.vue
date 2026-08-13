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

<style lang="postcss">
.bk-diff-value {
  @apply inline;
  word-break: break-word;

  .bk-is-clipped {
    del {
      @apply line-clamp-4;
    }
  }

  del {
    @apply line-through text-mono-500;

    &:has(img) {
      @apply block overflow-hidden max-w-300 bg-red-normal;
      @apply border-2 border-red-normal;
      img {
        opacity: 0.7;
      }
    }
  }

  ins {
    @apply bg-lime-light rounded text-lime-dark border border-lime-normal/30 no-underline;

    &:has(img) {
      @apply border-2 border-lime-normal;
      @apply block overflow-hidden max-w-300;
    }
  }

  del:has(img) + ins:has(img) {
    @apply mt-15;
  }
}
</style>
