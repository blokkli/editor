<template>
  <div
    class="bk-comments-overlay-item absolute top-0 left-0 pointer-events-auto origin-top-left size-[46px]"
    :style="style"
    :class="{
      'z-comments-overlay-active': showComments,
      'bk-is-left': isLeft,
      'bk-is-right': !isLeft,
    }"
  >
    <button
      v-show="!showComments"
      class="font-bold leading-none text-[46px] text-mono-600 z-20 origin-top-left size-full relative group"
      @click.prevent="$emit('toggle')"
      @pointerdown.prevent.stop
      @pointerup.prevent.stop
      @pointermove.prevent.stop
    >
      <div
        class="absolute top-[0.069em] left-[0.069em] right-[0.069em] h-[0.7em]"
        :class="[
          unresolvedCount > 0
            ? 'text-yellow-dark group-hover:text-yellow-light'
            : 'text-white',
        ]"
      >
        <div
          class="size-full flex items-center justify-center text-[0.4em] leading-none"
        >
          <span>{{ unresolvedCount || roots.length }}</span>
        </div>
      </div>
      <div v-show="!showComments" class="col-start-1 row-start-1">
        <Icon
          name="bk_mdi_chat_bubble-fill"
          class="size-full"
          :class="
            unresolvedCount > 0
              ? 'text-yellow-normal group-hover:text-yellow-dark'
              : 'text-mono-400 group-hover:text-mono-600'
          "
        />
      </div>
    </button>
    <div
      v-if="showComments"
      class="bg-white shadow-xl origin-top-left absolute top-[4px] z-10 rounded overflow-hidden border border-mono-400"
      :class="{ 'left-3': isLeft, 'right-3': !isLeft }"
      :style="{
        width: width + 'px',
      }"
      @pointerdown.capture.stop
      @pointerup.capture.stop
      @pointermove.capture.stop
      @wheel.passive="onWheel"
    >
      <div
        class="bg-mono-200 h-[32px] text-xs uppercase tracking-wide font-semibold flex items-center border-b border-b-mono-400 text-mono-700"
        :class="{
          'pl-15': !isLeft,
        }"
      >
        <div>{{ countLabel }}</div>
        <button
          class="size-[32px] flex items-center justify-center hover:bg-mono-300"
          :class="{
            'ml-auto': !isLeft,
            'order-first mr-3': isLeft,
          }"
          @click.prevent="$emit('toggle')"
        >
          <Icon name="bk_mdi_close" class="size-15" />
        </button>
      </div>
      <div ref="scrollEl" class="max-h-[60vh] overflow-y-auto">
        <CommentThread
          v-for="root in roots"
          :key="root.uuid"
          :root="root"
          :replies="getRepliesFor(root.uuid)"
          @reply="$emit('reply', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @resolve="$emit('resolveComment', root.uuid)"
          @unresolve="$emit('unresolveComment', root.uuid)"
          @toggle-task="$emit('toggleTask', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, useTemplateRef } from '#imports'
import { Icon } from '#blokkli/editor/components'
import CommentThread from './../../Thread/index.vue'
import type { CommentItem } from '../../types'

const { $t } = useBlokkli()

defineEmits<{
  (e: 'toggle'): void
  (e: 'reply', data: { parentUuid: string; body: string }): void
  (e: 'edit', data: { uuid: string; body: string }): void
  (e: 'toggleTask', data: { uuid: string; taskIndex: number }): void
  (e: 'delete' | 'resolveComment' | 'unresolveComment', uuid: string): void
}>()

const props = defineProps<{
  isReduced: boolean
  isLeft: boolean
  uuids: string[]
  roots: CommentItem[]
  replies: CommentItem[]
  style: any
  showComments: boolean
  width: number
}>()

const unresolvedCount = computed(
  () => props.roots.filter((r) => !r.resolved).length,
)

const countLabel = computed(() => {
  const count = props.roots.length
  const template =
    count === 1
      ? $t('commentsCountOne', '1 comment')
      : $t('commentsCountOther', '@count comments')
  return template.replace('@count', count.toString())
})

const scrollEl = useTemplateRef('scrollEl')

let hasScrollbar: null | boolean = null

const onWheel = (e: WheelEvent) => {
  if (hasScrollbar === null) {
    const element = scrollEl.value
    hasScrollbar = element && element.scrollHeight > element.clientHeight
  }
  if (hasScrollbar) {
    if (!e.ctrlKey && !e.metaKey) {
      e.stopPropagation()
    }
  }
}

function getRepliesFor(rootUuid: string): CommentItem[] {
  return props.replies.filter((r) => r.parentUuid === rootUuid)
}
</script>
