<template>
  <div
    class="band container-wide grid gap-x-grid gap-y-8 py-8 lg:grid-cols-12 lg:items-center lg:py-12"
  >
    <div
      class="flex flex-col gap-5"
      :class="hasImage ? 'lg:col-span-7' : 'lg:col-span-8'"
    >
      <h1 v-blokkli-editable:title class="font-serif text-h1 text-balance">
        {{ title }}
      </h1>
      <p
        v-if="lead || isEditing"
        v-blokkli-editable:field_lead
        class="max-w-content font-serif text-lead"
      >
        {{ lead }}
      </p>
      <SearchField
        large
        :label="$texts('search.title', 'Search')"
        :placeholder="
          $texts(
            'home.search_placeholder',
            'e.g. waste calendar, building application, dog tax',
          )
        "
        class="max-w-content"
      />
    </div>
    <div
      v-if="hasImage"
      v-blokkli-droppable:field_hero_image
      class="aspect-3/2 overflow-hidden bg-line lg:col-span-5"
    >
      <MediaImage
        v-if="image"
        v-bind="image"
        class="size-full"
        img-class="size-full object-cover"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { SearchField } from '#components'
import type { MediaImageFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'

// The home page's title and lead on the band, with the search below them and
// the hero image beside them.
const props = defineProps<{
  title?: string | null
  lead?: string | null
  image?: MediaImageFragment | null
  // The editorial page's header option: without the image when "plain".
  variant: 'image' | 'plain'
  isEditing: boolean
}>()

const hasImage = computed(
  () => props.variant !== 'plain' && (!!props.image || props.isEditing),
)
</script>
