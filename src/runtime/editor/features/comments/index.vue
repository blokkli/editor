<template>
  <PluginSidebar
    id="comments"
    :title="$t('comments', 'Comments')"
    :tour-text="
      $t('commentsTourText', 'Shows all comments for the current page.')
    "
    icon="bk_mdi_chat"
    weight="-20"
  >
    <CommentSidebar
      :comments="comments"
      @add="onAddComment($event, [])"
      @reply="onReply($event.parentUuid, $event.body)"
      @edit="onEditComment($event.uuid, $event.body)"
      @delete="onDeleteComment($event)"
      @resolve="onResolveComment($event)"
      @unresolve="onUnresolveComment($event)"
    />

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
    @reply="onReply($event.parentUuid, $event.body)"
    @edit="onEditComment($event.uuid, $event.body)"
    @delete="onDeleteComment($event)"
    @resolve-comment="onResolveComment($event)"
    @unresolve-comment="onUnresolveComment($event)"
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
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar, PluginItemAction } from '#blokkli/editor/plugins'
import { BlokkliTransition } from '#blokkli/editor/components'
import CommentSidebar from './CommentSidebar/index.vue'
import type { CommentItem } from './types'

const CommentsOverlay = defineAsyncComponent(
  () => import('./Overlay/index.vue'),
)
const CommentAddForm = defineAsyncComponent(() => import('./AddForm/index.vue'))

const { adapter } = defineBlokkliFeature({
  id: 'comments',
  icon: 'bk_mdi_chat',
  label: 'Comments',
  requiredAdapterMethods: ['loadComments', 'addComment'],
  requiredPermissions: ['view_comments'],
  description: 'Provides comment functionality for blocks.',
  screenshot: 'feature-comments.jpg',
})

const { $t, selection, ui } = useBlokkli()

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
  () => comments.value.filter((c) => !c.parentUuid && !c.resolved).length,
)

const onAddComment = async (body: string, providedUuids?: string[]) => {
  if (!adapter.addComment) {
    return
  }
  const uuids = providedUuids ?? [...selection.uuids.value]
  comments.value = await adapter.addComment(uuids, body)
  showAddComment.value = false
}

const onReply = async (parentUuid: string, body: string) => {
  if (!adapter.replyToComment) {
    return
  }
  comments.value = await adapter.replyToComment(parentUuid, body)
}

const onEditComment = async (uuid: string, body: string) => {
  if (!adapter.editComment) {
    return
  }
  comments.value = await adapter.editComment(uuid, body)
}

const onDeleteComment = async (uuid: string) => {
  if (!adapter.deleteComment) {
    return
  }
  comments.value = await adapter.deleteComment(uuid)
}

const onResolveComment = async (uuid: string) => {
  if (!adapter.resolveComment) {
    return
  }
  comments.value = await adapter.resolveComment(uuid)
}

const onUnresolveComment = async (uuid: string) => {
  if (!adapter.unresolveComment) {
    return
  }
  comments.value = await adapter.unresolveComment(uuid)
}
</script>

<script lang="ts">
export default {
  name: 'Comments',
}
</script>
