<template>
  <div
    class="flex items-center bg-white border border-mono-400 rounded shadow relative"
  >
    <CommentActionButton
      v-if="canEdit"
      icon="bk_mdi_edit"
      :label="$t('commentEdit', 'Edit')"
      @click="$emit('edit')"
    />
    <CommentActionButton
      v-if="canDelete"
      icon="bk_mdi_delete"
      :label="$t('commentDelete', 'Delete')"
      scheme="red"
      @click="onDeleteClick"
    />
    <CommentActionButton
      v-if="canResolve"
      icon="bk_mdi_check_circle"
      scheme="lime"
      :label="$t('commentsMarkAsResolved', 'Mark as resolved')"
      @click="$emit('resolve')"
    />
    <CommentActionButton
      v-if="canUnresolve"
      icon="bk_mdi_unpublished"
      scheme="lime"
      :label="$t('commentsMarkAsUnresolved', 'Mark as unresolved')"
      @click="$emit('unresolve')"
    />

    <Teleport :to="ui.mainLayoutElement.value">
      <BlokkliTransition name="slide-up">
        <DialogModal
          v-if="showConfirm"
          :id="dialogId"
          :title="
            isReply
              ? $t('commentDeleteReplyConfirmTitle', 'Delete reply?')
              : $t('commentDeleteConfirmTitle', 'Delete comment?')
          "
          :lead="
            isReply
              ? $t(
                  'commentDeleteReplyConfirmText',
                  'The reply will be permanently deleted. This action cannot be undone.',
                )
              : $t(
                  'commentDeleteConfirmText',
                  'The comment and all its replies will be permanently deleted. This action cannot be undone.',
                )
          "
          :submit-label="$t('commentDeleteConfirmSubmit', 'Delete')"
          is-danger
          @submit="onConfirmDelete"
          @cancel="showConfirm = false"
        />
      </BlokkliTransition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { BlokkliTransition, DialogModal } from '#blokkli/editor/components'
import { useDialog } from '#blokkli/editor/composables'
import CommentActionButton from './Button/index.vue'

const { $t, ui } = useBlokkli()

const props = defineProps<{
  uuid: string
  isReply: boolean
  canEdit: boolean
  canDelete: boolean
  canResolve: boolean
  canUnresolve: boolean
}>()

const emit = defineEmits<{
  (e: 'edit' | 'delete' | 'resolve' | 'unresolve'): void
}>()

const dialogId = 'comment-delete-' + props.uuid
const showConfirm = useDialog(dialogId, 'center')

function onDeleteClick() {
  showConfirm.value = true
}

function onConfirmDelete() {
  showConfirm.value = false
  emit('delete')
}
</script>

<script lang="ts">
export default {
  name: 'CommentActions',
}
</script>
