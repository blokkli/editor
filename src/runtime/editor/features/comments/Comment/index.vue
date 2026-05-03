<template>
  <div
    class="group/comment relative flex gap-(--bk-comment-avatar-gap) px-(--bk-comment-pad-x) py-(--bk-comment-pad-y) hover:bg-mono-50 font-sans"
    :class="{ 'cursor-pointer': clickable }"
    @click.stop="$emit('clickComment')"
  >
    <CommentAvatar
      :name="comment.user.label"
      :seed="comment.user.id || comment.user.label"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-5 flex-wrap">
        <CommentMeta
          :user="comment.user"
          :created="comment.created"
          :updated="comment.updated"
        />
        <Pill v-if="comment.resolved && !isReply" scheme="lime">
          <Icon name="bk_mdi_check" class="size-10 mr-2" />
          {{ $t('commentResolvedLabel', 'Resolved') }}
        </Pill>
      </div>
      <CommentEditForm
        v-if="isEditing"
        :uuid="comment.uuid"
        :body="comment.body"
        class="mt-5"
        @submit="onSubmitEdit"
        @cancel="isEditing = false"
        @click.stop
      />
      <div
        v-else
        class="text-sm text-mono-900 whitespace-pre-wrap break-words select-text mt-2"
      >
        {{ comment.body }}
      </div>
    </div>

    <div
      v-if="!isEditing && (canEdit || canDelete || canResolve || canUnresolve)"
      class="absolute top-3 right-10 opacity-0 group-hover/comment:opacity-100 focus-within:opacity-100"
    >
      <CommentActions
        :uuid="comment.uuid"
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
import { Icon, Pill } from '#blokkli/editor/components'
import CommentAvatar from '../CommentAvatar/index.vue'
import CommentMeta from '../CommentMeta/index.vue'
import CommentActions from '../CommentActions/index.vue'
import CommentEditForm from '../CommentEditForm/index.vue'
import type { CommentItem } from '../types'

const { $t, adapter } = useBlokkli()

const props = defineProps<{
  comment: CommentItem
  isReply: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', body: string): void
  (e: 'delete' | 'resolve' | 'unresolve' | 'clickComment'): void
}>()

const isEditing = ref(false)

const canEdit = computed(() => !!props.comment.isOwn && !!adapter.editComment)

const canDelete = computed(
  () => !!props.comment.isOwn && !!adapter.deleteComment,
)

const canResolve = computed(
  () => !props.isReply && !props.comment.resolved && !!adapter.resolveComment,
)

const canUnresolve = computed(
  () => !props.isReply && props.comment.resolved && !!adapter.unresolveComment,
)

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
