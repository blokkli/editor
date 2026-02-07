<template>
  <PluginSidebar
    id="comments"
    :title="$t('comments', 'Comments')"
    :tour-text="
      $t('commentsTourText', 'Shows all comments for the current page.')
    "
    icon="bk_mdi_comment"
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
    :title="$t('addCommentToItem', 'Add Comment...')"
    :active="showAddComment"
    weight="last"
    icon="bk_mdi_add_comment"
    multiple
    @click="showAddComment = !showAddComment"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="caret-tooltip">
      <CommentAddForm
        v-if="showAddComment"
        ref="commentForm"
        @add="onAddComment($event)"
        @close="showAddComment = false"
      />
    </BlokkliTransition>
  </Teleport>

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
  useTemplateRef,
} from '#imports'
import { PluginSidebar, PluginItemAction } from '#blokkli/editor/plugins'
import { BlokkliTransition } from '#blokkli/editor/components'
import Comment from './Comment/index.vue'
import CommentAddForm from './AddForm/index.vue'
import CommentsOverlay from './Overlay/index.vue'
import type { CommentItem } from './types'

const { adapter } = defineBlokkliFeature({
  id: 'comments',
  icon: 'bk_mdi_comment',
  label: 'Comments',
  requiredAdapterMethods: ['loadComments', 'addComment'],
  requiredPermissions: ['view_comments'],
  description: 'Provides comment functionality for blocks.',
  screenshot: 'feature-comments.jpg',
})

const { eventBus, $t, selection, ui } = useBlokkli()

const commentForm = useTemplateRef('commentForm')
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

const onAddComment = async (body: string, providedUuids?: string[]) => {
  const uuids = providedUuids ?? [...selection.uuids.value]
  if (uuids.length) {
    comments.value = await adapter.addComment(uuids, body)
  }
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
