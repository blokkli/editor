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
      v-model:show-resolved="showResolved"
      :comments
      :recently-resolved
      @add="onAddComment($event, [])"
      @reply="onReply($event.parentUuid, $event.body)"
      @edit="onEditComment($event.uuid, $event.body)"
      @delete="onDeleteComment($event)"
      @resolve="onResolveComment($event)"
      @unresolve="onUnresolveComment($event)"
      @toggle-task="onToggleTask($event.uuid, $event.taskIndex)"
    />

    <template v-if="unresolvedCount" #badge>
      <div class="bk-sidebar-badge bk-is-yellow">{{ unresolvedCount }}</div>
    </template>
  </PluginSidebar>

  <PluginItemAction
    id="add_comment"
    :title="$t('addCommentToItem', 'Add Comment...')"
    :description="
      $t(
        'addCommentToItemDescription',
        'Add a new comment for the selected blocks.',
      )
    "
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
    :comments
    :show-resolved
    :recently-resolved
    @reply="onReply($event.parentUuid, $event.body)"
    @edit="onEditComment($event.uuid, $event.body)"
    @delete="onDeleteComment($event)"
    @resolve-comment="onResolveComment($event)"
    @unresolve-comment="onUnresolveComment($event)"
    @toggle-task="onToggleTask($event.uuid, $event.taskIndex)"
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
import CommentSidebar from './Sidebar/index.vue'
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

const { $t, selection, ui, storage } = useBlokkli()

const showResolved = storage.useWithContextPrefix('commentsShowResolved', false)

/**
 * UUIDs of comments resolved during this sidebar session. They stay visible
 * even when "Show resolved" is off, so the user can see what they just acted
 * on instead of having it disappear from the list. Cleared on unmount —
 * reopening the sidebar starts fresh.
 */
const recentlyResolved = ref<string[]>([])

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
  if (!recentlyResolved.value.includes(uuid)) {
    recentlyResolved.value.push(uuid)
  }
  comments.value = await adapter.resolveComment(uuid)
}

const onUnresolveComment = async (uuid: string) => {
  if (!adapter.unresolveComment) {
    return
  }
  const idx = recentlyResolved.value.indexOf(uuid)
  if (idx !== -1) {
    recentlyResolved.value.splice(idx, 1)
  }
  comments.value = await adapter.unresolveComment(uuid)
}

const onToggleTask = async (uuid: string, taskIndex: number) => {
  if (!adapter.toggleCommentTask) {
    return
  }
  const updated = await adapter.toggleCommentTask(uuid, taskIndex)
  const idx = comments.value.findIndex((c) => c.uuid === updated.uuid)
  if (idx >= 0) {
    comments.value[idx] = updated
  }
}
</script>

<script lang="ts">
export default {
  name: 'Comments',
}
</script>
