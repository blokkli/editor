<template>
  <InlineActions>
    <InlineActionsButton
      v-if="canEdit"
      icon="bk_mdi_edit"
      :label="$t('edit', 'Edit')"
      data-test="comment-action-edit"
      @click="$emit('edit')"
    />
    <InlineActionsButton
      v-if="canDelete"
      icon="bk_mdi_delete"
      :label="$t('delete', 'Delete')"
      scheme="red"
      data-test="comment-action-delete"
      @click="onDeleteClick"
    />
    <InlineActionsButton
      v-if="canResolve"
      icon="bk_mdi_check_circle"
      scheme="lime"
      :label="$t('commentsMarkAsResolved', 'Mark as resolved')"
      data-test="comment-action-resolve"
      @click="$emit('resolve')"
    />
    <InlineActionsButton
      v-if="canUnresolve"
      icon="bk_mdi_unpublished"
      scheme="lime"
      :label="$t('commentsMarkAsUnresolved', 'Mark as unresolved')"
      data-test="comment-action-unresolve"
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
          :submit-label="$t('delete', 'Delete')"
          is-danger
          @submit="onConfirmDelete"
          @cancel="showConfirm = false"
        />
      </BlokkliTransition>
    </Teleport>
  </InlineActions>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { BlokkliTransition, DialogModal } from '#blokkli/editor/components'
import { useDialog } from '#blokkli/editor/composables'
import InlineActions from '#blokkli/editor/components/InlineActions/index.vue'
import InlineActionsButton from '#blokkli/editor/components/InlineActions/Button/index.vue'

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
