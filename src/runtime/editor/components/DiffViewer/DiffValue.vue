<template>
  <!-- eslint-disable-next-line vue/no-v-html -- the diff, sanitised -->
  <div class="bk-diff-value bk-diff-markup-style" v-html="diffHtml" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { computeDiff } from '#blokkli/editor/helpers/diff'
import { sanitizeHtml } from '#blokkli/editor/helpers/html'
import { escapeHtml } from '#blokkli/editor/helpers/string'

const props = defineProps<{
  before: string
  after: string
  afterOnly?: boolean
  /** The values are text, e.g. of a plain field: markup in them is shown. */
  plain?: boolean
}>()

// The values can come from anywhere: a file to import, a translation service,
// the raw stored value (plans/xss, X5).
const diffHtml = computed(() => {
  const before = props.plain ? escapeHtml(props.before) : props.before
  const after = props.plain ? escapeHtml(props.after) : props.after
  const html = props.afterOnly
    ? '<ins>' + after + '</ins>'
    : computeDiff(before, after)
  return sanitizeHtml(html, 'richText')
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
