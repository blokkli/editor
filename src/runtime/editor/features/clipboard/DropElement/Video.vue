<template>
  <div class="bk-clipboard-item-video">
    <img v-if="imgUrl" :src="imgUrl" />
    <div>
      <div>
        <Icon :name="icon" />
        <h3>{{ providerLabel }}</h3>
      </div>
      <p>{{ data }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
const props = defineProps<{
  data: string
  videoService?: string
  videoId: string
}>()

const imgUrl = computed(() => {
  if (props.videoService === 'youtube') {
    return `http://i3.ytimg.com/vi/${props.videoId}/hqdefault.jpg`
  }

  return null
})

const icon = computed<BlokkliIcon>(() => {
  switch (props.videoService) {
    case 'youtube':
      return 'youtube'

    case 'vimeo':
      return 'vimeo'

    case 'tiktok':
      return 'tiktok'
  }

  return 'bk_mdi_video_camera_back'
})

const providerLabel = computed(() => {
  switch (props.videoService) {
    case 'youtube':
      return 'YouTube'
    case 'vimeo':
      return 'Vimeo'
    case 'tiktok':
      return 'TikTok'
  }

  return props.videoService || 'Video'
})
</script>
