<template>
  <header :class="{ grid: isOverlay }">
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
          : ['band py-8 lg:pt-10', hasImage ? 'lg:pb-10' : 'lg:pb-12']
      "
    >
      <Breadcrumb
        v-if="breadcrumbItems.length > 1"
        :items="breadcrumbItems"
        class="mb-2"
      />
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
    </div>
    <!-- The image after the band, as wide as the container. The band reaches
         halfway down it. -->
    <div v-if="hasImage && !isOverlay" class="relative isolate">
      <div
        class="absolute inset-x-[-100vmax] top-0 bottom-1/2 -z-10 bg-surface"
      />
      <div class="container-wide">
        <div
          v-blokkli-droppable:field_hero_image
          class="aspect-[3/2] overflow-hidden bg-line lg:aspect-[5/2]"
        >
          <MediaImage
            v-if="image"
            v-bind="image"
            class="size-full"
            img-class="size-full object-cover"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type {
  BreadcrumbFragment,
  MediaImageFragment,
} from '#graphql-operations'
import Breadcrumb from '~/components/Breadcrumb/index.vue'
import MediaImage from '~/components/Media/Image/index.vue'

// A host's title and lead on the beige band, below the breadcrumb. The eyebrow
// above the title says what the page is (e.g. "News"), the meta below the lead
// e.g. its date.
const props = defineProps<{
  title?: string | null
  lead?: string | null
  /**
   * The host's `field_hero_image`. Leave it out for hosts without the field:
   * a droppable element for a field the host doesn't have breaks the editor.
   */
  image?: MediaImageFragment | null
  // image: after the band. overlay: the title on the image.
  variant: 'image' | 'overlay' | 'plain'
  isEditing: boolean
  // Drupal's, from the main menu: it ends with the current page, without a
  // link.
  breadcrumb?: BreadcrumbFragment[]
}>()

const breadcrumbItems = computed(() =>
  (props.breadcrumb ?? []).map((item) => ({
    label: item.title,
    url: item.url.path || undefined,
  })),
)

const hasImage = computed(
  () =>
    props.image !== undefined &&
    props.variant !== 'plain' &&
    (!!props.image || props.isEditing),
)

const isOverlay = computed(() => hasImage.value && props.variant === 'overlay')
</script>
