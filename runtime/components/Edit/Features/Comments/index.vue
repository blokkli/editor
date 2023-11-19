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
  >
    <Icon />
    <template v-if="showAddComment" v-slot:after="{ paragraphUuid }">
      <CommentAddForm @add="onAddComment(paragraphUuid, $event)" />
    </template>
  </PluginParagraphAction>

  <CommentsOverlay
    :comments="comments"
    @add-comment="onAddComment($event.uuid, $event.body)"
    @resolve-comment="onResolveComment($event)"
  />
</template>

<script lang="ts" setup>
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'
import Icon from './../../Icons/Comment.vue'
import Comment from './../../Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import { PbComment } from '~/modules/nuxt-paragraphs-builder/runtime/types'

const comments = ref<PbComment[]>([])

const showAddComment = ref(false)

const { entityType, entityUuid } = useParagraphsBuilderStore()

async function loadComments() {
  comments.value = await useGraphqlQuery('paragraphsBuilderComments', {
    entityType: entityType.toUpperCase() as any,
    entityUuid: entityUuid,
  }).then((v) => v.data.state?.comments || [])
}

async function onAddComment(uuid?: string, body: string) {
  if (!uuid) {
    return
  }
  const result = await useGraphqlMutation('paragraphsBuilderAddComment', {
    entityType: entityType.toUpperCase() as any,
    entityUuid: entityUuid,
    targetUuid: uuid,
    body,
  })
  if (result.data.state?.action) {
    comments.value = result.data.state.action
  }
}

async function onResolveComment(id: string | number) {
  const result = await useGraphqlMutation('paragraphsBuilderResolveComment', {
    entityType: entityType.toUpperCase() as any,
    entityUuid: entityUuid,
    id: String(id),
  })
  if (result.data.state?.action) {
    comments.value = result.data.state.action
  }
}

onMounted(() => {
  loadComments()
})
</script>
