<template>
  <div class="bk bk-comment" @click="$emit('clickComment')">
    <h3>
      {{ user?.label }}
    </h3>
    <RelativeTime v-slot="{ formatted }" :timestamp="timestamp">
      <div class="bk-comment-date">
        {{ formatted }}
      </div>
    </RelativeTime>
    <div class="bk-comment-body" v-html="body" />
    <button
      v-if="!resolved && resolveImplemeted"
      @click.capture.stop="$emit('resolve')"
    >
      <Icon name="check" />
      <span>{{ $t('commentsMarkAsResolved', 'Resolve') }}</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { CommentItem } from '#blokkli/types'
import { Icon, RelativeTime } from '#blokkli/components'

const { adapter, $t } = useBlokkli()

const resolveImplemeted = computed(() => !!adapter.resolveComment)

defineEmits<{
  (e: 'resolve' | 'clickComment'): void
}>()

const props = defineProps<{
  uuid?: string | number
  blockUuids?: string[]
  resolved?: boolean
  body?: string
  created?: CommentItem['created']
  user?: CommentItem['user']
}>()

const timestamp = computed(() =>
  props.created ? Number.parseInt(props.created.toString()) : 0,
)
</script>

<script lang="ts">
export default {
  name: 'Comment',
}
</script>
