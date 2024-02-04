<template>
  <PluginSidebar
    id="comments"
    :title="$t('comments', 'Comments')"
    icon="comment"
    weight="-20"
  >
    <div class="bk bk-comments bk-control">
      <ul>
        <li v-for="comment in comments" :key="comment.uuid">
          <Comment v-bind="comment" @click-comment="onClickComment(comment)" />
        </li>
      </ul>
    </div>
  </PluginSidebar>

  <PluginItemAction
    id="add_comment"
    :title="$t('addCommentToItem', 'Comment')"
    :active="showAddComment"
    weight="last"
    icon="comment"
    multiple
    @click="showAddComment = !showAddComment"
  >
    <template v-if="showAddComment" #default="{ uuids }">
      <CommentAddForm ref="commentForm" @add="onAddComment($event, uuids)" />
    </template>
  </PluginItemAction>

  <CommentsOverlay
    :comments="comments"
    @add-comment="onAddComment($event.body, $event.uuids)"
    @resolve-comment="onResolveComment($event)"
  />
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  useBlokkli,
  defineBlokkliFeature,
  useLazyAsyncData,
} from '#imports'
import { PluginSidebar, PluginItemAction } from '#blokkli/plugins'
import Comment from './Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import CommentsOverlay from './Overlay/index.vue'
import type { CommentItem } from '#blokkli/types'

const { adapter } = defineBlokkliFeature({
  id: 'comments',
  icon: 'comment',
  label: 'Comments',
  requiredAdapterMethods: ['loadComments', 'addComment'],
  description: 'Provides comment functionality for blocks.',
  screenshot: 'feature-comments.jpg',
})

const { eventBus, $t, selection } = useBlokkli()

const commentForm = ref<InstanceType<typeof CommentAddForm> | null>(null)
const showAddComment = ref(false)

watch(selection.uuids, () => {
  if (commentForm.value) {
    if (!commentForm.value.getComment()) {
      showAddComment.value = false
    }
  }
})

const { data: comments } = await useLazyAsyncData(
  () => adapter.loadComments(),
  { default: () => [] },
)

const onAddComment = async (body: string, uuids: string[]) => {
  comments.value = await adapter.addComment(uuids, body)
  showAddComment.value = false
}

const onResolveComment = async (uuid: string) => {
  if (!adapter.resolveComment) {
    return
  }
  comments.value = await adapter.resolveComment(uuid)
}

const onClickComment = (comment: CommentItem) =>
  eventBus.emit('select:end', comment.blockUuids || [])
</script>

<script lang="ts">
export default {
  name: 'Comments',
}
</script>
