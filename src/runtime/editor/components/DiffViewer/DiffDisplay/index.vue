<template>
  <DiffValue v-if="mode === 'inline'" :before :after :plain />
  <div v-else-if="mode === 'side_by_side'" class="bk-diff-prop-side-by-side">
    <div class="bk-diff-prop-before">
      <div class="bk-diff-prop-label">
        {{ $t('diffBefore', 'Before') }}
      </div>
      <!-- eslint-disable vue/no-v-html -- sanitised -->
      <div
        class="bk-diff-prop-content bk-diff-markup-style"
        v-html="beforeHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>
    <div class="bk-diff-prop-after">
      <div class="bk-diff-prop-label">
        {{ $t('after', 'After') }}
      </div>
      <!-- eslint-disable vue/no-v-html -- sanitised -->
      <div
        class="bk-diff-prop-content bk-diff-markup-style"
        v-html="afterHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>
  </div>
  <div v-else-if="mode === 'after'" class="bk-diff-prop-after-only">
    <!-- eslint-disable-next-line vue/no-v-html -- sanitised -->
    <div class="bk-diff-prop-content bk-diff-markup-style" v-html="afterHtml" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { sanitizeHtml } from '#blokkli/editor/helpers/html'
import { escapeHtml } from '#blokkli/editor/helpers/string'
import DiffValue from '../DiffValue.vue'

export type DiffDisplayMode = 'inline' | 'side_by_side' | 'after'

const props = defineProps<{
  before: string
  after: string
  mode: DiffDisplayMode
  /** The values are text, e.g. of a plain field: markup in them is shown. */
  plain?: boolean
}>()

const { $t } = useBlokkli()

/** A value as the views without a diff show it. */
function toHtml(value: string): string {
  return props.plain ? escapeHtml(value) : sanitizeHtml(value, 'richText')
}

const beforeHtml = computed(() => toHtml(props.before))
const afterHtml = computed(() => toHtml(props.after))
</script>
