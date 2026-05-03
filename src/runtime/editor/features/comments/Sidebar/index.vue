<template>
  <div
    class="bk bk-control h-full overflow-auto bk-scrollbar-light flex flex-col"
  >
    <div
      v-if="resolvedCount"
      class="flex items-center px-15 py-10 border-b border-b-mono-200"
    >
      <FormToggle
        v-model="showResolved"
        :label="$t('commentsShowResolved', 'Show resolved')"
      />
    </div>

    <div v-if="visibleRoots.length" class="select-text flex-1">
      <CommentThread
        v-for="root in visibleRoots"
        :key="root.uuid"
        :root="root"
        :replies="repliesByRoot.get(root.uuid) || []"
        @reply="$emit('reply', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @resolve="onResolve(root.uuid)"
        @unresolve="onUnresolve(root.uuid)"
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

    <SidebarAddForm @submit="$emit('add', $event)" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { FormToggle } from '#blokkli/editor/components'
import CommentThread from '../Thread/index.vue'
import SidebarAddForm from './AddForm/index.vue'
import type { CommentItem } from '../types'

const { $t, storage } = useBlokkli()

const props = defineProps<{
  comments: CommentItem[]
}>()

const emit = defineEmits<{
  (e: 'reply', value: { parentUuid: string; body: string }): void
  (e: 'edit', value: { uuid: string; body: string }): void
  (e: 'toggleTask', value: { uuid: string; taskIndex: number }): void
  (e: 'add' | 'delete' | 'resolve' | 'unresolve', value: string): void
}>()

const showResolved = storage.useWithContextPrefix('commentsShowResolved', false)

/**
 * UUIDs of comments resolved during this sidebar session. They stay visible
 * even when "Show resolved" is off, so the user can see what they just acted
 * on instead of having it disappear from the list. Cleared on unmount —
 * reopening the sidebar starts fresh.
 */
const recentlyResolved = ref<string[]>([])

function onResolve(uuid: string) {
  if (!recentlyResolved.value.includes(uuid)) {
    recentlyResolved.value.push(uuid)
  }
  emit('resolve', uuid)
}

function onUnresolve(uuid: string) {
  const idx = recentlyResolved.value.indexOf(uuid)
  if (idx !== -1) {
    recentlyResolved.value.splice(idx, 1)
  }
  emit('unresolve', uuid)
}

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
    (r) => !r.resolved || recentlyResolved.value.includes(r.uuid),
  )
})

const resolvedCount = computed(
  () => roots.value.filter((r) => r.resolved).length,
)
</script>

<script lang="ts">
export default {
  name: 'CommentSidebar',
}
</script>
