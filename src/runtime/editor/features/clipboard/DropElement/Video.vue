<template>
  <div class="bk-clipboard-item-video">
    <img
      v-if="imgUrl && imgUrl !== failedUrl"
      :src="imgUrl"
      data-test="clipboard-video-thumbnail"
      @error="failedUrl = imgUrl"
    />
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
import { computed, ref } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
const props = defineProps<{
  data: string
  videoService?: string
  videoId: string
}>()

// A Content-Security-Policy has to allow the host (`img-src`). Without it, the
// item shows the provider's icon and the URL, as for the other providers.
const imgUrl = computed(() => {
  if (props.videoService === 'youtube') {
    return `https://i.ytimg.com/vi/${encodeURIComponent(props.videoId)}/hqdefault.jpg`
  }

  return null
})

const failedUrl = ref<string | null>(null)

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
