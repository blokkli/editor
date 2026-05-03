<template>
  <div class="flex items-baseline gap-5 flex-wrap min-w-0 text-sm">
    <span class="font-semibold text-mono-900 truncate">
      {{ user.label }}
    </span>
    <RelativeTime v-slot="{ formatted }" :timestamp="createdTimestamp">
      <span class="text-xs text-mono-500">{{ formatted }}</span>
    </RelativeTime>
    <span v-if="updatedTimestamp" class="text-mono-500 italic text-xs">
      ({{ $t('commentEdited', 'edited') }})
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { RelativeTime } from '#blokkli/editor/components'
import type { CommentItem } from '../types'

const { $t } = useBlokkli()

const props = defineProps<{
  user: CommentItem['user']
  created: CommentItem['created']
  updated?: CommentItem['updated']
}>()

const createdTimestamp = computed(() =>
  props.created ? Number.parseInt(props.created.toString()) : 0,
)

const updatedTimestamp = computed(() =>
  props.updated ? Number.parseInt(props.updated.toString()) : 0,
)
</script>

<script lang="ts">
export default {
  name: 'CommentMeta',
}
</script>
