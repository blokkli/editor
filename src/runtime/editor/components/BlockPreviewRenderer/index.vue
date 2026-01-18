<template>
  <div
    class="bk-block-preview-renderer"
    :class="[backgroundClass, { 'bk-default-bg': !backgroundClass }]"
    :style="backgroundClass ? {} : { backgroundColor }"
  >
    <div class="bk-block-preview-renderer-items">
      <BlockPreviewRendererItem
        v-for="uuid in uuids"
        :key="uuid"
        :uuid="uuid"
        :max-height="maxHeight"
        @background-color="onBackgroundColor"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from '#imports'
import BlockPreviewRendererItem from './Item.vue'

withDefaults(
  defineProps<{
    uuids: string[]
    backgroundClass?: string
    maxHeight?: number
  }>(),
  {
    backgroundClass: '',
    maxHeight: 400,
  },
)

const backgroundColor = ref('')

function onBackgroundColor(color: string) {
  if (!backgroundColor.value) {
    backgroundColor.value = color
  }
}
</script>
