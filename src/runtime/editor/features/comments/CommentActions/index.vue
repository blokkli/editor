<template>
  <div
    class="flex items-center bg-white border border-mono-400 rounded shadow-sm relative"
  >
    <CommentActionButton
      v-if="canResolve"
      icon="bk_mdi_check"
      :label="$t('commentsMarkAsResolved', 'Mark as resolved')"
      @click="$emit('resolve')"
    />
    <CommentActionButton
      v-if="canUnresolve"
      icon="bk_mdi_replay"
      :label="$t('commentsMarkAsUnresolved', 'Mark as unresolved')"
      @click="$emit('unresolve')"
    />
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
      variant="danger"
      @click="onDeleteClick"
    />

    <Teleport :to="ui.mainLayoutElement.value">
      <BlokkliTransition name="slide-up">
        <DialogModal
          v-if="showConfirm"
          :id="dialogId"
          :title="$t('commentDeleteConfirmTitle', 'Delete comment?')"
          :lead="
            $t(
              'commentDeleteConfirmText',
              'This comment and any replies will be removed.',
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
import CommentActionButton from '../CommentActionButton/index.vue'

const { $t, ui } = useBlokkli()

const props = defineProps<{
  uuid: string
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
