<template>
  <div
    ref="rootEl"
    class="bk bk-control h-full overflow-auto bk-scrollbar-light flex flex-col bg-mono-100"
  >
    <div
      class="flex items-center px-15 py-10 border-b border-b-mono-300 bg-white"
    >
      <FormToggle
        v-model="showResolved"
        :label="$t('commentsShowResolved', 'Show resolved')"
        data-test="comments-show-resolved"
      />
    </div>

    <div
      v-if="visibleRoots.length"
      class="select-text flex-1 p-10 flex flex-col gap-10"
    >
      <CommentThread
        v-for="root in visibleRoots"
        :key="root.uuid"
        :root="root"
        :replies="repliesByRoot.get(root.uuid) || []"
        boxed
        @reply="$emit('reply', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @resolve="$emit('resolve', root.uuid)"
        @unresolve="$emit('unresolve', root.uuid)"
        @toggle-task="$emit('toggleTask', $event)"
      />
    </div>
    <div
      v-else
      class="flex-1 flex items-center justify-center p-30 text-center text-sm text-mono-500"
    >
      {{
        roots.length
          ? $t(
              'commentsAllResolved',
              'All comments are resolved. Toggle "Show resolved" to view them.',
            )
          : $t('commentsEmpty', 'No comments yet.')
      }}
    </div>

    <SidebarAddForm @submit="$emit('add', $event)" @start="onStartNewComment" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, useTemplateRef } from '#imports'
import { FormToggle } from '#blokkli/editor/components'
import CommentThread from '../Thread/index.vue'
import SidebarAddForm from './AddForm/index.vue'
import type { CommentItem } from '../types'

const { $t } = useBlokkli()

const props = defineProps<{
  comments: CommentItem[]
  recentlyResolved: string[]
}>()

defineEmits<{
  (e: 'reply', value: { parentUuid: string; body: string }): void
  (e: 'edit', value: { uuid: string; body: string }): void
  (e: 'toggleTask', value: { uuid: string; taskIndex: number }): void
  (e: 'add' | 'delete' | 'resolve' | 'unresolve', value: string): void
}>()

const rootEl = useTemplateRef('rootEl')

const showResolved = defineModel<boolean>('showResolved', {
  default: false,
})

const byCreated = (a: CommentItem, b: CommentItem) =>
  Date.parse(a.created) - Date.parse(b.created)

const roots = computed(() =>
  [...props.comments].filter((c) => !c.parentUuid).sort(byCreated),
)

const repliesByRoot = computed(() => {
  const map = new Map<string, CommentItem[]>()
  for (const comment of props.comments) {
    if (!comment.parentUuid) {
      continue
    }
    const list = map.get(comment.parentUuid) || []
    list.push(comment)
    map.set(comment.parentUuid, list)
  }
  for (const list of map.values()) {
    list.sort(byCreated)
  }
  return map
})

const visibleRoots = computed(() => {
  if (showResolved.value) {
    return roots.value
  }
  return roots.value.filter(
    (r) => !r.resolved || props.recentlyResolved.includes(r.uuid),
  )
})

let scrollTimeout: number | null = null

function onStartNewComment() {
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout)
    scrollTimeout = null
  }
  scrollTimeout = window.setTimeout(() => {
    if (!rootEl.value) {
      return
    }
    rootEl.value.scrollTop = rootEl.value.scrollHeight
  }, 10)
}
</script>

<script lang="ts">
export default {
  name: 'CommentSidebar',
}
</script>
