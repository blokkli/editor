<template>
  <div class="bk bk-comment" @click="$emit('clickComment')">
    <h3 class="bk-comment-title">
      {{ user?.label }}
    </h3>
    <RelativeTime v-slot="{ formatted }" :timestamp="timestamp">
      <div class="bk-comment-date">
        {{ formatted }}
      </div>
    </RelativeTime>
    <div class="bk-comment-body" v-html="body" />
    <button v-if="!resolved && resolveImplemeted" @click="$emit('resolve')">
      <Icon name="check" />
      <span>Als erledigt markieren</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { CommentItem } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import { RelativeTime } from '#blokkli/components'

const { adapter } = useBlokkli()

const resolveImplemeted = computed(() => !!adapter.resolveComment)

defineEmits<{
  (e: 'resolve'): void
  (e: 'clickComment'): void
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
  props.created ? parseInt(props.created.toString()) : 0,
)
</script>

<script lang="ts">
export default {
  name: 'Comment',
}
</script>
