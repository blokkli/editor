<template>
  <PluginSidebar id="comments" title="Kommentare">
    <template #icon>
      <Icon />
    </template>
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
  >
    <Icon />
    <template v-if="showAddComment" v-slot:after="{ paragraphUuid }">
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
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'
import Icon from './../../Icons/Comment.vue'
import Comment from './../../Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import CommentsOverlay from './Overlay/index.vue'
import { PbComment } from '~/modules/nuxt-paragraphs-builder/runtime/types'

const comments = ref<PbComment[]>([])
const showAddComment = ref(false)
const { adapter } = useParagraphsBuilderStore()

const loadComments = async () => (comments.value = await adapter.loadComments())

const onAddComment = async (body: string, uuid: string) => {
  comments.value = await adapter.addComment(uuid, body)
  showAddComment.value = false
}

const onResolveComment = async (uuid: string) =>
  (comments.value = await adapter.resolveComment(uuid))

onMounted(loadComments)
</script>
