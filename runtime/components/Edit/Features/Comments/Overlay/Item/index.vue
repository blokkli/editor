<template>
  <div
    class="bk-comments-overlay-item"
    :style="style"
    :class="{
      'bk-is-active': showComments,
      'bk-is-left': isLeft,
    }"
  >
    <button
      class="bk-comments-overlay-item-button"
      @click="$emit('toggle')"
      :class="{
        'bk-has-unresolved-comments': unresolvedCount > 0,
      }"
    >
      <Icon name="close" v-if="showComments" />
      <span v-else>{{ unresolvedCount }}</span>
    </button>
    <div
      class="bk-comments-overlay-comments"
      v-show="showComments"
      :class="{ 'bk-is-left': isLeft }"
    >
      <div class="bk-comments-overlay-comments-header">
        <Icon name="comment" />
        <span>{{ comments.length }} Kommentare</span>
      </div>
      <div
        class="bk-comments-overlay-comments-item"
        v-for="comment in comments"
      >
        <Comment v-bind="comment" @resolve="resolveComment(comment.uuid)" />
      </div>
      <div class="bk-comments-overlay-form" @keydown.capture.stop>
        <textarea
          v-model="commentText"
          type="text"
          class="bk-form-input"
          placeholder="Antworten"
          @focus="showFullForm = true"
          required
        >
        </textarea>
        <button
          @click="addComment"
          class="bk-button bk-is-primary is-small"
          v-if="showFullForm && commentText"
        >
          Kommentar speichern
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { BlokkliComment } from '#blokkli/types'
import Comment from '#blokkli/components/Comment/index.vue'
import { Icon } from '#blokkli/components'

const commentText = ref('')
const showFullForm = ref(false)
const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'addComment', text: string): void
  (e: 'resolveComment', uuid: string): void
}>()

const props = defineProps<{
  isReduced: boolean
  isLeft: boolean
  uuids: string[]
  comments: BlokkliComment[]
  style: any
  showComments: boolean
}>()

const unresolvedCount = computed(
  () => props.comments.filter((v) => !v.resolved).length,
)

function addComment() {
  emit('addComment', commentText.value)
  showFullForm.value = false
  commentText.value = ''
}

function resolveComment(uuid: string | undefined) {
  if (uuid) {
    emit('resolveComment', uuid)
  }
}
</script>
