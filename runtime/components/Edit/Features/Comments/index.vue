<template>
  <PluginSidebar id="comments" title="Kommentare" icon="comment">
    <div class="bk bk-comments bk-control">
      <ul>
        <li v-for="comment in comments">
          <Comment v-bind="comment" @click-comment="onClickComment(comment)" />
        </li>
      </ul>
    </div>
  </PluginSidebar>

  <PluginParagraphAction
    title="Kommentieren"
    @click="showAddComment = !showAddComment"
    :active="showAddComment"
    :weight="100"
    icon="comment"
    multiple
  >
    <template v-if="showAddComment" v-slot="{ uuids }">
      <CommentAddForm @add="onAddComment($event, uuids)" />
    </template>
  </PluginParagraphAction>

  <CommentsOverlay
    :comments="comments"
    @add-comment="onAddComment($event.body, $event.uuids)"
    @resolve-comment="onResolveComment($event)"
  />
</template>

<script lang="ts" setup>
import { PluginSidebar, PluginParagraphAction } from '#blokkli/plugins'
import Comment from './../../Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import CommentsOverlay from './Overlay/index.vue'
import type { BlokkliComment } from '#blokkli/types'

const comments = ref<BlokkliComment[]>([])
const showAddComment = ref(false)
const { adapter, eventBus } = useBlokkli()

const loadComments = async () => (comments.value = await adapter.loadComments())

const onAddComment = async (body: string, uuids: string[]) => {
  comments.value = await adapter.addComment(uuids, body)
  showAddComment.value = false
}

const onResolveComment = async (uuid: string) =>
  (comments.value = await adapter.resolveComment(uuid))

const onClickComment = (comment: BlokkliComment) =>
  eventBus.emit('select:end', comment.paragraphUuids || [])

onMounted(loadComments)
</script>
