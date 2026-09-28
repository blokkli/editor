<template>
  <div :class="parentType ? '' : WIDTH_CLASSES[options.width]">
    <a
      :href="video?.url ?? undefined"
      target="_blank"
      rel="noopener"
      class="group block"
    >
      <span class="relative block bg-ink">
        <img
          v-if="thumbnail?.urlPath"
          :src="thumbnail.urlPath"
          :width="thumbnail.width ?? undefined"
          :height="thumbnail.height ?? undefined"
          alt=""
          loading="lazy"
          class="aspect-video w-full object-cover"
        />
        <span class="absolute inset-0 flex items-center justify-center">
          <span
            class="flex size-16 items-center justify-center bg-primary text-white group-hover:bg-primary-dark"
          >
            <SpriteSymbol name="play" class="size-7" />
          </span>
        </span>
      </span>
      <span
        class="mt-2 block text-small text-muted group-hover:underline"
        :class="{
          'container-content': options.width === 'full' && !parentType,
        }"
      >
        {{ video?.name }}
      </span>
    </a>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import { SpriteSymbol } from '#components'
import type { ParagraphVideoFragment } from '#graphql-operations'
import { WIDTH_CLASSES } from '~/helpers/width'

const props = defineProps<ParagraphVideoFragment>()

// A link, not an embed: the site frames only its own pages (Paragraph/Embed).
const thumbnail = computed(() => props.video?.thumbnail?.derivative)

const { options, parentType } = defineBlokkli({
  bundle: 'video',
  globalOptions: ['width', 'bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_smart_display',
    editTitle: (el) => el.textContent?.trim(),
    determineVisibleOptions: (ctx) => (ctx.parentType ? [] : ['width']),
  },
})
</script>
