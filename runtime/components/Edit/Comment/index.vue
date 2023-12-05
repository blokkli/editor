<template>
  <div class="bk bk-comment" @click="$emit('clickComment')">
    <h3 class="bk-comment-title">{{ user?.label }}</h3>
    <RelativeTime :timestamp="timestamp" v-slot="{ formatted }">
      <div class="bk-comment-date">
        {{ formatted }}
      </div>
    </RelativeTime>
    <div class="bk-comment-body" v-html="body" />
    <button @click="$emit('resolve')" v-if="!resolved">
      <Icon name="check" />
      <span>Als erledigt markieren</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { BlokkliComment } from '#blokkli/types'
import { Icon } from '#blokkli/components'
import { RelativeTime } from '#blokkli/components'

defineEmits<{
  (e: 'resolve'): void
  (e: 'clickComment'): void
}>()

const props = defineProps<{
  uuid?: string | number
  paragraphUuids?: string[]
  resolved?: boolean
  body?: string
  created?: BlokkliComment['created']
  user?: BlokkliComment['user']
}>()

const timestamp = computed(() =>
  props.created?.first?.value ? parseInt(props.created.first.value) : 0,
)
</script>
