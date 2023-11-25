<template>
  <div
    class="pb-comments-overlay-item"
    :style="style"
    :class="{
      'pb-is-active': showComments,
    }"
  >
    <button
      class="pb-comments-overlay-item-button"
      @click="$emit('toggle')"
      :class="{
        'pb-has-unresolved-comments': unresolvedCount > 0,
      }"
    >
      <IconClose v-if="showComments" />
      <span v-else>{{ unresolvedCount }}</span>
    </button>
    <div
      class="pb-comments-overlay-comments"
      v-show="showComments"
      :class="{ 'pb-is-left': isLeft }"
    >
      <div class="pb-comments-overlay-comments-header">
        <IconComment />
        <span>{{ comments.length }} Kommentare</span>
      </div>
      <div
        class="pb-comments-overlay-comments-item"
        v-for="comment in comments"
      >
        <Comment v-bind="comment" @resolve="resolveComment(comment.uuid)" />
      </div>
      <div class="pb-comments-overlay-form" @keydown.capture.stop>
        <textarea
          v-model="commentText"
          type="text"
          class="pb-form-input"
          placeholder="Antworten"
          @focus="showFullForm = true"
          required
        >
        </textarea>
        <button
          @click="addComment"
          class="pb-button pb-is-primary is-small"
          v-if="showFullForm && commentText"
        >
          Kommentar speichern
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { PbComment } from './../../../../../../types'
import Comment from './../../../../Comment/index.vue'
import IconClose from './../../../../Icons/Close.vue'
import IconComment from './../../../../Icons/Comment.vue'

const commentText = ref('')
const showFullForm = ref(false)
const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'addComment', text: string): void
  (e: 'resolveComment', id: string): void
}>()

const props = defineProps<{
  isReduced: boolean
  isLeft: boolean
  target: string
  comments: PbComment[]
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

function resolveComment(id: string | number | undefined) {
  if (id) {
    emit('resolveComment', id.toString())
  }
}
</script>
