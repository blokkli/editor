<template>
  <div :class="{ 'container my-40': !parentType }">
    <div :class="{ 'overflow-hidden shadow-xl rounded-lg': options.elevated }">
      <div v-if="url && src" class="aspect-[16/9] relative bg-gray">
        <a
          v-if="thumbnail && !isPlaying"
          :href="url"
          class="absolute top-0 left-0 w-full h-full group"
          @click.prevent="isPlaying = true"
        >
          <div
            class="bg-gradient-to-b from-black/50 to-black/0 absolute top-0 left-0 w-full text-white z-20 p-10 lg:p-20 font-bold text-xs md:text-sm lg:text-xl"
          >
            <h3>{{ title }}</h3>
          </div>
          <img
            :src="thumbnail"
            class="relative w-full h-full object-cover"
            loading="lazy"
          />
          <div
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/30 w-80 h-80 p-20 rounded-full transition group-hover:scale-110"
          >
            <div class="relative h-full w-full">
              <SpriteSymbol
                name="play"
                class="absolute top-0 left-0 w-full h-full translate-x-4 fill-white"
              />
            </div>
          </div>
        </a>
        <iframe
          v-else
          :src="src"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, ref } from '#imports'
import type { MediaVideo } from '~/app/mock/state/Media/Media'

const { options, parentType } = defineBlokkli({
  bundle: 'video',
  options: {
    elevated: {
      type: 'checkbox',
      label: 'Elevated',
      default: true,
    },
  },
  editor: {
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})

const props = defineProps<{
  video: MediaVideo
}>()

const isPlaying = ref(false)

const url = computed(() => props.video.url())
const thumbnail = computed(() => props.video.thumbnail())
const youtubeId = computed(() => props.video.getYouTubeID())
const title = computed(() => props.video.title())

const src = computed(() => {
  if (youtubeId.value) {
    const params = new URLSearchParams()
    if (thumbnail.value) {
      params.set('autoplay', '1')
    }
    return `https://www.youtube-nocookie.com/embed/${
      youtubeId.value
    }?${params.toString()}`
  }
})
</script>
