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
import type { ClipboardItemVideo } from '#blokkli/types'
import { Icon } from '#blokkli/components'

const props = defineProps<ClipboardItemVideo>()

const imgUrl = computed(() => {
  if (props.videoService === 'youtube') {
    return `http://i3.ytimg.com/vi/${props.videoId}/hqdefault.jpg`
  }

  return null
})

const icon = computed<'tiktok' | 'youtube' | 'vimeo' | 'video-outline'>(() => {
  switch (props.videoService) {
    case 'youtube':
      return 'youtube'

    case 'vimeo':
      return 'vimeo'

    case 'tiktok':
      return 'tiktok'
  }

  return 'video-outline'
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
