<template>
  <div
    v-if="isEditing"
    class="px-(--bk-comment-pad-x) font-sans relative z-50"
    :class="
      isReply ? 'py-(--bk-comment-reply-pad-y)' : 'py-(--bk-comment-pad-y)'
    "
    @click.stop
  >
    <CommentEditForm
      :uuid="comment.uuid"
      :body="comment.body"
      @submit="onSubmitEdit"
      @cancel="isEditing = false"
    />
  </div>
  <div
    v-else
    class="group/comment relative flex gap-(--bk-comment-avatar-gap) px-(--bk-comment-pad-x) font-sans"
    :class="
      isReply ? 'py-(--bk-comment-reply-pad-y)' : 'py-(--bk-comment-pad-y)'
    "
  >
    <Avatar
      :name="comment.user.name"
      :seed="comment.user.id"
      :image-url="comment.user.imageUrl"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-5 flex-wrap">
        <CommentMeta
          :user="comment.user"
          :created="comment.created"
          :updated="comment.updated"
        />
        <Pill
          v-if="comment.resolved && !isReply"
          scheme="lime"
          icon="bk_mdi_check"
          :text="$t('commentResolvedLabel', 'Resolved')"
        />
        <Pill
          v-if="!isReply && !hideBlocksPill && comment.blockUuids?.length"
          tag="button"
          type="button"
          scheme="accent"
          variant="light"
          icon="bk_mdi_widgets"
          :text="blocksLabel"
          @click.stop="$emit('selectBlocks')"
        />
      </div>
      <RichTextRenderer
        :body="comment.body"
        :task-togglable="canToggleTasks"
        class="mt-2"
        @toggle-task="$emit('toggleTask', $event)"
      />
    </div>

    <div
      v-if="canEdit || canDelete || canResolve || canUnresolve"
      class="absolute top-8 right-10 opacity-0 group-hover/comment:opacity-100 focus-within:opacity-100"
    >
      <CommentActions
        :uuid="comment.uuid"
        :is-reply="isReply"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-resolve="canResolve"
        :can-unresolve="canUnresolve"
        @edit="onStartEdit"
        @delete="$emit('delete')"
        @resolve="$emit('resolve')"
        @unresolve="$emit('unresolve')"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { Avatar, Pill } from '#blokkli/editor/components'
import CommentMeta from './Meta/index.vue'
import CommentActions from './Actions/index.vue'
import CommentEditForm from './EditForm/index.vue'
import RichTextRenderer from '#blokkli/editor/components/RichText/Renderer/index.vue'
import type { CommentItem } from '../types'

const { $t, adapter, user } = useBlokkli()

const props = defineProps<{
  comment: CommentItem
  isReply: boolean
  hideBlocksPill?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', body: string): void
  (e: 'toggleTask', taskIndex: number): void
  (e: 'delete' | 'resolve' | 'unresolve' | 'selectBlocks'): void
}>()

const isEditing = ref(false)

const blocksLabel = computed(() => {
  const count = props.comment.blockUuids?.length || 0
  const template =
    count === 1
      ? $t('commentBlocksCountOne', '1 block')
      : $t('commentBlocksCountOther', '@count blocks')
  return template.replace('@count', count.toString())
})

const isOwn = computed(() => user.isCurrent(props.comment.user.id))

const canEdit = computed(() => isOwn.value && !!adapter.editComment)

const canDelete = computed(() => isOwn.value && !!adapter.deleteComment)

const canResolve = computed(
  () => !props.isReply && !props.comment.resolved && !!adapter.resolveComment,
)

const canUnresolve = computed(
  () => !props.isReply && props.comment.resolved && !!adapter.unresolveComment,
)

const canToggleTasks = computed(() => !!adapter.toggleCommentTask)

function onStartEdit() {
  isEditing.value = true
}

function onSubmitEdit(body: string) {
  emit('edit', body)
  isEditing.value = false
}
</script>

<script lang="ts">
export default {
  name: 'Comment',
}
</script>
