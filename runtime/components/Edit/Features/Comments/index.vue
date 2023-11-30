<template>
  <PluginSidebar id="comments" title="Kommentare" icon="comment">
    <div class="pb pb-comments pb-control">
      <ul>
        <li v-for="comment in comments">
          <Comment v-bind="comment" />
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
  >
    <template v-if="showAddComment" v-slot="{ paragraphUuid }">
      <CommentAddForm @add="onAddComment($event, paragraphUuid)" />
    </template>
  </PluginParagraphAction>

  <CommentsOverlay
    :comments="comments"
    @add-comment="onAddComment($event.body, $event.uuid)"
    @resolve-comment="onResolveComment($event)"
  />
</template>

<script lang="ts" setup>
import { PluginSidebar, PluginParagraphAction } from '#pb/plugins'
import Comment from './../../Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import CommentsOverlay from './Overlay/index.vue'
import type { PbComment } from '#pb/types'

const comments = ref<PbComment[]>([])
const showAddComment = ref(false)
const { adapter } = useBlokkli()

const loadComments = async () => (comments.value = await adapter.loadComments())

const onAddComment = async (body: string, uuid: string) => {
  comments.value = await adapter.addComment([uuid], body)
  showAddComment.value = false
}

const onResolveComment = async (uuid: string) =>
  (comments.value = await adapter.resolveComment(uuid))

onMounted(loadComments)
</script>
