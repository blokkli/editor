<template>
  <div
    class="bk-comments-overlay-item"
    :style="style"
    :class="{
      'bk-is-active': showComments,
      'bk-is-left': isLeft,
      'bk-is-right': !isLeft,
    }"
  >
    <button
      class="bk-comments-overlay-item-button"
      :class="{
        'bk-has-unresolved-comments': unresolvedCount > 0,
      }"
      @click.prevent="$emit('toggle')"
      @pointerdown.prevent.stop
      @pointerup.prevent.stop
      @pointermove.prevent.stop
    >
      <Icon v-if="showComments" name="close" />
      <span v-else>{{ unresolvedCount }}</span>
    </button>
    <div
      v-if="showComments"
      class="bk-comments-overlay-comments"
      :class="{ 'bk-is-left': isLeft, 'bk-is-right': !isLeft }"
      @pointerdown.capture.stop
      @pointerup.capture.stop
      @pointermove.capture.stop
    >
      <div class="bk-comments-overlay-comments-header">
        <Icon name="comment" />
        <span
          >{{ comments.length }}
          {{
            comments.length === 1
              ? $t('singleComment', 'comment')
              : $t('comments', 'Comments')
          }}</span
        >
      </div>
      <div v-for="comment in comments" :key="comment.uuid">
        <Comment v-bind="comment" @resolve="resolveComment(comment.uuid)" />
      </div>
      <div class="bk-comments-overlay-form" @keydown.capture.stop>
        <textarea
          v-model.lazy="commentText"
          type="text"
          class="bk-form-input"
          :placeholder="$t('commentBodyPlaceholder', 'Add reply')"
          required
          @focus="showFullForm = true"
        />
        <button
          v-if="showFullForm && commentText"
          class="bk-button bk-is-primary bk-is-small"
          @click="addComment"
        >
          {{ $t('commentAdd', 'Add comment') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, useState } from '#imports'
import type { CommentItem } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import Comment from './../../Comment/index.vue'

const { $t, storage } = useBlokkli()

const commentText = storage.useWithContextPrefix('commentReply', '')
const showFullForm = ref(false)
const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'addComment' | 'resolveComment', text: string): void
}>()

const props = defineProps<{
  isReduced: boolean
  isLeft: boolean
  uuids: string[]
  comments: CommentItem[]
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
