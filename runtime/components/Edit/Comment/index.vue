<template>
  <div class="pb pb-comment">
    <h3 class="pb-comment-title">{{ user?.label }}</h3>
    <RelativeTime :timestamp="timestamp" v-slot="{ formatted }">
      <div class="pb-comment-date">
        {{ formatted }}
      </div>
    </RelativeTime>
    <div class="pb-comment-body" v-html="body" />
    <button @click="$emit('resolve')" v-if="!resolved">
      <IconCheck />
      <span>Als erledigt markieren</span>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { PbComment } from '../../../types'
import IconCheck from './../Icons/Check.vue'
import RelativeTime from './../RelativeTime/index.vue'

defineEmits<{
  (e: 'resolve'): void
}>()

const props = defineProps<{
  uuid?: string | number
  targetUuid?: string
  resolved?: boolean
  body?: string
  created?: PbComment['created']
  user?: PbComment['user']
}>()

const timestamp = computed(() =>
  props.created?.first?.value ? parseInt(props.created.first.value) : 0,
)
</script>
