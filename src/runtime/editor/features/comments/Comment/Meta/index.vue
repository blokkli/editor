<template>
  <div class="flex items-baseline gap-3 flex-wrap min-w-0 text-sm -mt-2">
    <span class="font-semibold text-mono-900 truncate">
      {{ user.name }}
    </span>
    <RelativeTime v-slot="{ formatted }" :timestamp="created">
      <span class="text-xs text-mono-500">{{ formatted }}</span>
    </RelativeTime>
    <span v-if="updated" class="text-mono-500 italic text-xs">
      ({{ $t('commentEdited', 'edited') }})
    </span>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { RelativeTime } from '#blokkli/editor/components'
import type { CommentItem } from '../../types'

const { $t } = useBlokkli()

defineProps<{
  user: CommentItem['user']
  created: CommentItem['created']
  updated?: CommentItem['updated']
}>()
</script>

<script lang="ts">
export default {
  name: 'CommentMeta',
}
</script>
