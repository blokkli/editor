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
  defineAsyncComponent,
} from '#imports'
import { PluginSidebar, PluginItemAction } from '#blokkli/editor/plugins'
import { BlokkliTransition } from '#blokkli/editor/components'
import Comment from './Comment/index.vue'
import type { CommentItem } from './types'

const CommentsOverlay = defineAsyncComponent(
  () => import('./Overlay/index.vue'),
)
const CommentAddForm = defineAsyncComponent(() => import('./AddForm/index.vue'))

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

<style lang="postcss">
.bk.bk-comments-overlay {
  @apply fixed top-0 left-0 w-full h-full pointer-events-none z-comments-overlay;
  .bk-comments-overlay-item {
    @apply absolute top-0 left-0  pointer-events-auto w-40 h-40 origin-top-left;
    &.bk-is-active {
      @apply z-comments-overlay-active;
    }
  }
  .bk-comments-overlay-item-button {
    @apply text-lg font-bold leading-none relative bg-mono-300 text-mono-600 hover:bg-mono-400 flex items-center justify-center z-20 origin-top-left;
    @apply w-full h-full;
    &.bk-has-unresolved-comments {
      @apply bg-yellow-normal text-yellow-dark hover:bg-yellow-dark hover:text-yellow-light;
    }
    svg {
      @apply fill-current w-20 h-20;
    }
    span {
      @apply mt-2;
    }
  }
  .bk-comments-overlay-comments {
    @apply bg-white shadow-xl  origin-top-left absolute top-40  z-10;
    &.bk-is-right {
      @apply right-0;
    }
    &.bk-is-left {
      @apply left-0;
      .bk-comments-overlay-comments-header {
        @apply justify-between flex-row-reverse;
      }
    }
  }
  .bk-comments-overlay-comments-header {
    @apply h-40 pl-10 bg-mono-100 flex items-center uppercase text-xs font-semibold border-b border-b-mono-300 text-mono-600 pr-10;
    svg {
      @apply w-15 h-15 mr-5 fill-current;
    }
  }
  .bk-comments-overlay-form {
    @apply p-10 lg:p-20;
    button {
      @apply w-full mt-10 lg:mt-20;
    }
  }
}

.bk.bk-comment {
  @apply font-sans text-base p-15 lg:p-20 border-b hover:bg-mono-50;
  h3 {
    @apply font-sans font-bold;
  }
  .bk-comment-date {
    @apply text-xs text-mono-500;
  }
  .bk-comment-body {
    @apply mt-5 break-words lg:mt-15;
  }
  &:hover {
    button {
      @apply opacity-100;
    }
  }

  button {
    @apply items-center text-lime-normal font-medium px-5 py-2 border border-lime-normal rounded flex opacity-0;
    svg {
      @apply w-15 h-15 fill-current mr-5;
    }
  }
}

.bk.bk-add-comment {
  --bk-bg: white;
  --bk-header-bg: theme('colors.yellow.normal');
  --bk-header-text: theme('colors.yellow.dark');
  --bk-border: theme('colors.yellow.normal');
  --bk-header-hover: rgb(var(--bk-theme-yellow-dark) / 0.2);

  .bk-add-comment-inner {
    padding: var(--bk-gap);
    @apply w-full min-w-[360px];
    textarea {
    }
    .bk-button {
      @apply w-full;
      margin-top: var(--bk-gap);
    }
  }
}
</style>
