<template>
  <header :class="isOverlay ? 'is-overlay grid' : 'band'">
    <div
      v-if="isOverlay"
      v-blokkli-droppable:field_hero_image
      class="relative col-start-1 row-start-1 aspect-[2/1] min-h-96 overflow-hidden bg-ink lg:aspect-[3/1]"
    >
      <MediaImage
        v-if="image"
        v-bind="image"
        class="size-full"
        img-class="size-full object-cover"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/30 to-transparent"
      />
    </div>
    <div
      class="container-content flex flex-col gap-4"
      :class="
        isOverlay
          ? 'on-dark z-10 col-start-1 row-start-1 self-end pb-10 text-white lg:pb-12'
          : 'py-8 lg:pt-10 lg:pb-12'
      "
    >
      <p
        v-if="$slots.eyebrow"
        class="text-label uppercase"
        :class="isOverlay ? 'text-white' : 'text-primary'"
      >
        <slot name="eyebrow" />
      </p>
      <h1 v-blokkli-editable:title class="font-serif text-h1 text-balance">
        {{ title }}
      </h1>
      <p
        v-if="lead || isEditing"
        v-blokkli-editable:field_lead
        class="font-serif text-lead"
      >
        {{ lead }}
      </p>
      <p
        v-if="$slots.meta"
        class="flex flex-wrap gap-x-7 gap-y-1 text-small"
        :class="isOverlay ? 'text-on-dark' : 'text-muted'"
      >
        <slot name="meta" />
      </p>
      <div
        v-if="hasImage && !isOverlay"
        v-blokkli-droppable:field_hero_image
        class="mt-4 aspect-[2/1] overflow-hidden bg-line"
      >
        <MediaImage
          v-if="image"
          v-bind="image"
          class="size-full"
          img-class="size-full object-cover"
        />
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { MediaImageFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'

// A host's title and lead on the beige band. The eyebrow above the title says
// what the page is (e.g. "News"), the meta below the lead e.g. its date.
const props = defineProps<{
  title?: string | null
  lead?: string | null
  /**
   * The host's `field_hero_image`. Leave it out for hosts without the field:
   * a droppable element for a field the host doesn't have breaks the editor.
   */
  image?: MediaImageFragment | null
  // image: in the band, below the lead. overlay: the title on the image.
  variant: 'image' | 'overlay' | 'plain'
  isEditing: boolean
}>()

const hasImage = computed(
  () =>
    props.image !== undefined &&
    props.variant !== 'plain' &&
    (!!props.image || props.isEditing),
)

const isOverlay = computed(() => hasImage.value && props.variant === 'overlay')
</script>
