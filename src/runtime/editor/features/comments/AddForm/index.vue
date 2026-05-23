<template>
  <ArtboardTooltip
    id="add-comment"
    :title="$t('addComment', 'Add Comment')"
    class="bk-add-comment"
    @close="$emit('close')"
  >
    <div
      class="bk-add-comment-inner w-full min-w-[400px] border-t border-t-yellow-dark"
      @keydown.capture.stop
    >
      <CommentInput
        id="comment_body"
        :initial-value="comment"
        :submit-label="$t('commentSave', 'Submit comment')"
        @change="comment = $event"
        @submit="onAdd"
      />
    </div>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import { ArtboardTooltip } from '#blokkli/editor/components'
import CommentInput from './../CommentInput/index.vue'

const emit = defineEmits<{
  (e: 'add', comment: string): void
  (e: 'close'): void
}>()

const { $t, ui, storage } = useBlokkli()

// Persist the comment of the user accidentally closes the tooltip, so it's
// not lost.
const comment = storage.useWithContextPrefix('commentAddText', '')

const getComment = (): string => {
  return comment.value
}

function onAdd(value: string) {
  emit('add', value)
  comment.value = ''
}

defineExpose({ getComment })

onMounted(() => {
  ui.setSelectionColor('add-comment', 'yellow')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('add-comment')
})
</script>

<style lang="postcss">
.bk.bk-add-comment {
  --bk-bg: white;
  --bk-header-bg: theme('colors.yellow.normal');
  --bk-header-text: theme('colors.yellow.dark');
  --bk-border: theme('colors.yellow.normal');
  --bk-header-hover: rgb(var(--bk-theme-yellow-dark) / 0.2);
}
</style>
