<template>
  <ArtboardTooltip
    id="add-comment"
    :title="$t('addCommentHeader', 'Add Comment')"
    class="bk-add-comment"
    @close="$emit('close')"
  >
    <div class="bk-add-comment-inner" @keydown.capture.stop>
      <CommentInput id="comment_body" v-model="comment" />
      <footer>
        <button
          :disabled="!comment"
          class="bk-button bk-is-warning"
          @click.prevent="onAdd"
        >
          {{ $t('commentSave', 'Submit comment') }}
        </button>
      </footer>
    </div>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import { ArtboardTooltip } from '#blokkli/components'
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

function onAdd() {
  emit('add', comment.value)
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
