<template>
  <div class="container-wide">
    <a
      :href="video?.url ?? undefined"
      target="_blank"
      rel="noopener"
      class="group relative block"
    >
      <img
        v-if="thumbnail?.urlPath"
        :src="thumbnail.urlPath"
        :width="thumbnail.width ?? undefined"
        :height="thumbnail.height ?? undefined"
        alt=""
        loading="lazy"
        class="aspect-video w-full object-cover"
      />
      <span class="mt-2 block text-sm text-stone-600 group-hover:underline">
        {{ video?.name }}
      </span>
    </a>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphVideoFragment } from '#graphql-operations'

const props = defineProps<ParagraphVideoFragment>()

// A link, not an embed: an iframe would swallow the editor's clicks.
const thumbnail = computed(() => props.video?.thumbnail?.derivative)

defineBlokkli({
  bundle: 'video',
  editor: {
    icon: 'bk_mdi_smart_display',
    editTitle: (el) => el.textContent?.trim(),
  },
})
</script>
