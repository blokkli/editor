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
        v-model="comment"
        type="text"
        class="bk-form-input"
        rows="5"
        required
      />
      <footer>
        <button class="bk-button bk-is-warning" @click="$emit('add', comment)">
          {{ $t('commentSave', 'Submit comment') }}
        </button>
      </footer>
    </div>
  </ArtboardTooltip>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, useBlokkli } from '#imports'
import { ArtboardTooltip } from '#blokkli/components'

defineEmits(['add', 'close'])

const { $t, ui } = useBlokkli()

const comment = ref('')

const getComment = (): string => {
  return comment.value
}

defineExpose({ getComment })

onMounted(() => {
  ui.setSelectionColor('add-comment', 'yellow')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('add-comment')
})
</script>
