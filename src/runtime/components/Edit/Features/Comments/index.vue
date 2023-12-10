<template>
  <PluginSidebar
    id="comments"
    :title="text('comments')"
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
    :title="text('addCommentToItem')"
    :active="showAddComment"
    :weight="100"
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
import { ref, useBlokkli, onMounted } from '#imports'

import { PluginSidebar, PluginItemAction } from '#blokkli/plugins'
import Comment from './../../Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import CommentsOverlay from './Overlay/index.vue'
import type { BlokkliComment } from '#blokkli/types'

const comments = ref<BlokkliComment[]>([])
const showAddComment = ref(false)
const { adapter, eventBus, text } = useBlokkli()

const loadComments = async () => (comments.value = await adapter.loadComments())

const onAddComment = async (body: string, uuids: string[]) => {
  comments.value = await adapter.addComment(uuids, body)
  showAddComment.value = false
}

const onResolveComment = async (uuid: string) =>
  (comments.value = await adapter.resolveComment(uuid))

const onClickComment = (comment: BlokkliComment) =>
  eventBus.emit('select:end', comment.itemUuids || [])

onMounted(loadComments)
</script>
