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
    :title="$t('addCommentToItem', 'Comment')"
    :active="showAddComment"
    weight="last"
    icon="comment"
    multiple
    @click="showAddComment = !showAddComment"
  >
    <template v-if="showAddComment" #default="{ uuids }">
      <CommentAddForm @add="onAddComment($event, uuids)" />
    </template>
  </PluginItemAction>

  <CommentsOverlay
    :comments="comments"
    @add-comment="onAddComment($event.body, $event.uuids)"
    @resolve-comment="onResolveComment($event)"
  />
</template>

<script lang="ts" setup>
import { ref, useBlokkli, onMounted, defineBlokkliFeature } from '#imports'
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
})
const { eventBus, $t } = useBlokkli()

const comments = ref<CommentItem[]>([])
const showAddComment = ref(false)

const loadComments = async () => (comments.value = await adapter.loadComments())

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
  eventBus.emit('select:end', comment.itemUuids || [])

onMounted(loadComments)
</script>

<script lang="ts">
export default {
  name: 'Comments',
}
</script>
