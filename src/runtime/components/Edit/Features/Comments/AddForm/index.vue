<template>
  <ArtboardTooltip
    id="add-comment"
    :title="$t('addCommentHeader', 'Add Comment')"
    class="bk-add-comment"
    @close="$emit('close')"
  >
    <div class="bk-add-comment-inner" @keydown.capture.stop>
      <textarea
        id="comment_body"
        ref="textarea"
        v-model="comment"
        type="text"
        class="bk-form-input"
        rows="5"
        required
      />
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
import {
  onBeforeUnmount,
  onMounted,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import { ArtboardTooltip } from '#blokkli/components'

const emit = defineEmits<{
  (e: 'add', comment: string): void
  (e: 'close'): void
}>()

const textarea = useTemplateRef('textarea')

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
  if (textarea.value) {
    textarea.value.focus()
  }
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('add-comment')
})
</script>
