<template>
  <header class="grid">
    <div
      v-if="hasImage"
      v-blokkli-droppable:field_hero_image
      class="relative col-start-1 row-start-1 overflow-hidden bg-surface"
      :class="
        variant === 'overlay'
          ? 'aspect-[2/1] min-h-80'
          : 'aspect-[3/1] min-h-40'
      "
    >
      <MediaImage
        v-if="image"
        v-bind="image"
        class="size-full"
        img-class="size-full object-cover"
      />
      <div
        v-if="variant === 'overlay'"
        class="absolute inset-0 bg-linear-to-t from-ink/70 to-transparent"
      />
    </div>
    <div
      class="container-content"
      :class="
        hasImage && variant === 'overlay'
          ? 'z-10 col-start-1 row-start-1 self-end pb-12 text-white'
          : 'pt-12'
      "
    >
      <slot name="meta" />
      <h1 v-blokkli-editable:title class="font-serif text-h1">
        {{ title }}
      </h1>
      <p
        v-if="lead || isEditing"
        v-blokkli-editable:field_lead
        class="mt-4 font-serif text-lead"
        :class="{ 'text-muted': !hasImage || variant !== 'overlay' }"
      >
        {{ lead }}
      </p>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { MediaImageFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'

const props = defineProps<{
  title?: string | null
  lead?: string | null
  /**
   * The host's `field_hero_image`. Leave it out for hosts without the field:
   * a droppable element for a field the host doesn't have breaks the editor.
   */
  image?: MediaImageFragment | null
  variant: 'image' | 'overlay' | 'plain'
  isEditing: boolean
}>()

const hasImage = computed(
  () =>
    props.image !== undefined &&
    props.variant !== 'plain' &&
    (!!props.image || props.isEditing),
)
</script>
