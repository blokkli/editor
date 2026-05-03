<template>
  <article
    class="bk-comment-thread relative font-sans border-b-2 border-mono-300 last:border-b-0"
  >
    <div
      :class="{
        'opacity-50 hover:opacity-100': root.resolved,
      }"
    >
      <Comment
        :comment="root"
        :is-reply="false"
        class="pb-10!"
        @select-blocks="onSelectBlocks"
        @edit="$emit('edit', { uuid: root.uuid, body: $event })"
        @delete="$emit('delete', root.uuid)"
        @resolve="$emit('resolve')"
        @unresolve="$emit('unresolve')"
        @toggle-task="$emit('toggleTask', { uuid: root.uuid, taskIndex: $event })"
      />
      <div
        v-if="replies.length"
        class="absolute top-(--bk-comment-line-top) left-(--bk-comment-line-x) bottom-(--bk-comment-line-bottom) w-(--bk-comment-line-width) rounded-full bg-mono-200 pointer-events-none"
      />
      <div
        v-if="replies.length || canReply"
        class="ml-(--bk-comment-avatar-center) pl-(--bk-comment-reply-pl)"
      >
        <Comment
          v-for="reply in replies"
          :key="reply.uuid"
          :comment="reply"
          is-reply
          @edit="$emit('edit', { uuid: reply.uuid, body: $event })"
          @delete="$emit('delete', reply.uuid)"
          @toggle-task="
            $emit('toggleTask', { uuid: reply.uuid, taskIndex: $event })
          "
        />
        <div
          v-if="canReply"
          class="px-(--bk-comment-pad-x) pb-(--bk-comment-pad-y)"
        >
          <CommentReplyForm
            :root-uuid="root.uuid"
            @submit="$emit('reply', { parentUuid: root.uuid, body: $event })"
          />
        </div>
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import Comment from '../Comment/index.vue'
import CommentReplyForm from './ReplyForm/index.vue'
import type { CommentItem } from '../types'

const { adapter, eventBus } = useBlokkli()

const props = defineProps<{
  root: CommentItem
  replies: CommentItem[]
}>()

defineEmits<{
  (e: 'reply', value: { parentUuid: string; body: string }): void
  (e: 'edit', value: { uuid: string; body: string }): void
  (e: 'toggleTask', value: { uuid: string; taskIndex: number }): void
  (e: 'delete', uuid: string): void
  (e: 'resolve' | 'unresolve'): void
}>()

const canReply = computed(() => !!adapter.replyToComment)

function onSelectBlocks() {
  if (props.root.blockUuids?.length) {
    eventBus.emit('select:end', props.root.blockUuids)
  }
}
</script>

<script lang="ts">
export default {
  name: 'CommentThread',
}
</script>

<style lang="postcss">
.bk-comment-thread {
  /* Tunable values — change these and the layout adjusts everywhere. */
  --bk-comment-pad-x: 8px;
  --bk-comment-pad-y: 15px;
  --bk-comment-reply-pad-y: 5px;
  --bk-comment-avatar-size: 15px;
  --bk-comment-avatar-gap: 5px;
  --bk-comment-line-width: 2px;
  /* Gap between the bottom of the root avatar and the start of the thread line. */
  --bk-comment-line-gap: 4px;
  /* Distance from the article bottom to the end of the line — leaves room for
   * the reply button/form area (and the article's own bottom padding). */
  --bk-comment-line-bottom: var(--bk-comment-pad-y);

  /* Derived — do not change directly. */
  --bk-comment-avatar-center: calc(
    var(--bk-comment-pad-x) + var(--bk-comment-avatar-size) / 2
  );
  --bk-comment-content-x: calc(
    var(--bk-comment-pad-x) + var(--bk-comment-avatar-size) +
      var(--bk-comment-avatar-gap)
  );
  /* Padding inside the replies column so a reply Comment lines up with the root content. */
  --bk-comment-reply-pl: calc(
    var(--bk-comment-content-x) - var(--bk-comment-avatar-center) -
      var(--bk-comment-pad-x)
  );
  /* Line top: just below the root avatar, regardless of root content length. */
  --bk-comment-line-top: calc(
    var(--bk-comment-pad-y) + var(--bk-comment-avatar-size) +
      var(--bk-comment-line-gap)
  );
  /* Line X position: centered on the avatar column. */
  --bk-comment-line-x: calc(
    var(--bk-comment-avatar-center) - var(--bk-comment-line-width) / 2
  );

  @variant 2xl {
    --bk-comment-avatar-size: 25px;
    --bk-comment-avatar-gap: 8px;
    --bk-comment-pad-x: 10px;
  }

  @variant 3xl {
    --bk-comment-avatar-size: 30px;
    --bk-comment-avatar-gap: 10px;
    --bk-comment-reply-pad-y: 10px;
  }

  @variant 4xl {
    --bk-comment-avatar-size: 35px;
    --bk-comment-pad-x: 20px;
  }
}
</style>
