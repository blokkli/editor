<template>
  <PluginSidebar
    id="comments"
    :title="$t('comments', 'Comments')"
    :tour-text="
      $t('commentsTourText', 'Shows all comments for the current page.')
    "
    icon="comment"
    weight="-20"
  >
    <div v-if="comments.length" class="bk bk-control">
      <ul>
        <li v-for="comment in comments" :key="comment.uuid">
          <Comment
            v-bind="comment"
            @click-comment="onClickComment(comment)"
            @resolve="onResolveComment(comment.uuid)"
          />
        </li>
      </ul>
    </div>
    <template v-if="unresolvedCount" #badge>
      <div class="bk-sidebar-badge bk-is-yellow">{{ unresolvedCount }}</div>
    </template>
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
    v-if="comments.length"
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
  computed,
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
  if (commentForm.value && !commentForm.value.getComment()) {
    showAddComment.value = false
  }
})

const comments = ref<CommentItem[]>([])
comments.value = await adapter.loadComments()

const unresolvedCount = computed(
  () => comments.value.filter((v) => !v.resolved).length,
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
