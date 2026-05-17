<template>
  <DiffValue v-if="mode === 'inline'" :before="before" :after="after" />
  <div v-else-if="mode === 'side_by_side'" class="bk-diff-prop-side-by-side">
    <div class="bk-diff-prop-before">
      <div class="bk-diff-prop-label">
        {{ $t('diffBefore', 'Before') }}
      </div>
      <div class="bk-diff-prop-content bk-diff-markup-style" v-html="before" />
    </div>
    <div class="bk-diff-prop-after">
      <div class="bk-diff-prop-label">
        {{ $t('after', 'After') }}
      </div>
      <div class="bk-diff-prop-content bk-diff-markup-style" v-html="after" />
    </div>
  </div>
  <div v-else-if="mode === 'after'" class="bk-diff-prop-after-only">
    <div class="bk-diff-prop-content bk-diff-markup-style" v-html="after" />
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import DiffValue from '../DiffValue.vue'

export type DiffDisplayMode = 'inline' | 'side_by_side' | 'after'

defineProps<{
  before: string
  after: string
  mode: DiffDisplayMode
}>()

const { $t } = useBlokkli()
</script>
