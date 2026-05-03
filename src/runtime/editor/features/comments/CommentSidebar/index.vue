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
        select-blocks-on-click
        @reply="$emit('reply', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @resolve="$emit('resolve', root.uuid)"
        @unresolve="$emit('unresolve', root.uuid)"
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
import { computed, useBlokkli } from '#imports'
import { FormToggle } from '#blokkli/editor/components'
import CommentThread from '../CommentThread/index.vue'
import SidebarAddForm from '../SidebarAddForm/index.vue'
import type { CommentItem } from '../types'

const { $t, storage } = useBlokkli()

const props = defineProps<{
  comments: CommentItem[]
}>()

defineEmits<{
  (e: 'reply', value: { parentUuid: string; body: string }): void
  (e: 'edit', value: { uuid: string; body: string }): void
  (e: 'add' | 'delete' | 'resolve' | 'unresolve', value: string): void
}>()

const showResolved = storage.useWithContextPrefix('commentsShowResolved', false)

const roots = computed(() =>
  [...props.comments]
    .filter((c) => !c.parentUuid)
    .sort((a, b) => {
      const aCreated = Number.parseInt(a.created.toString())
      const bCreated = Number.parseInt(b.created.toString())
      return aCreated - bCreated
    }),
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
    list.sort((a, b) => {
      const aCreated = Number.parseInt(a.created.toString())
      const bCreated = Number.parseInt(b.created.toString())
      return aCreated - bCreated
    })
  }
  return map
})

const visibleRoots = computed(() =>
  showResolved.value ? roots.value : roots.value.filter((r) => !r.resolved),
)

const resolvedCount = computed(
  () => roots.value.filter((r) => r.resolved).length,
)
</script>

<script lang="ts">
export default {
  name: 'CommentSidebar',
}
</script>
