<template>
  <div class="pb pb-comment" @click="$emit('clickComment')">
    <h3 class="pb-comment-title">{{ user?.label }}</h3>
    <RelativeTime :timestamp="timestamp" v-slot="{ formatted }">
      <div class="pb-comment-date">
        {{ formatted }}
      </div>
    </RelativeTime>
    <div class="pb-comment-body" v-html="body" />
    <button @click="$emit('resolve')" v-if="!resolved">
      <Icon name="check" />
      <span>Als erledigt markieren</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { PbComment } from '#pb/types'
import { Icon } from '#pb/components'
import { RelativeTime } from '#pb/components'

defineEmits<{
  (e: 'resolve'): void
  (e: 'clickComment'): void
}>()

const props = defineProps<{
  uuid?: string | number
  paragraphUuids?: string[]
  resolved?: boolean
  body?: string
  created?: PbComment['created']
  user?: PbComment['user']
}>()

const timestamp = computed(() =>
  props.created?.first?.value ? parseInt(props.created.first.value) : 0,
)
</script>
