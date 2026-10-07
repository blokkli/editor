<template>
  <header>
    <div
      class="band flex flex-col gap-4 py-8 lg:pt-10"
      :class="[
        hasImage ? 'lg:pb-10' : 'lg:pb-12',
        { 'container-content': !contained },
      ]"
    >
      <Breadcrumb
        v-if="breadcrumbItems.length > 1"
        :items="breadcrumbItems"
        class="mb-2"
      />
      <p v-if="$slots.eyebrow" class="text-label text-primary uppercase">
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
        class="flex flex-wrap gap-x-7 gap-y-1 text-small text-muted"
      >
        <slot name="meta" />
      </p>
      <div v-if="$slots.actions" class="flex flex-wrap gap-3 pt-2">
        <slot name="actions" />
      </div>
    </div>
    <!-- The image after the band, as wide as the container. The band reaches
         halfway down it. -->
    <div v-if="hasImage" class="relative isolate">
      <div
        class="absolute inset-x-[-100vmax] top-0 bottom-1/2 -z-10 bg-surface"
      />
      <div :class="{ 'container-wide': !contained }">
        <div
          v-blokkli-droppable:[imageField]
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
import type {
  BreadcrumbFragment,
  MediaImageFragment,
} from '#graphql-operations'

// A host's title and lead on the beige band, below the breadcrumb. The eyebrow
// above the title says what the page is (e.g. "News"), the meta below the lead
// e.g. its date. The actions are buttons, e.g. an event's registration.
const props = defineProps<{
  title?: string | null
  lead?: string | null
  /**
   * The host's `field_hero_image`. Leave it out for hosts without the field:
   * a droppable element for a field the host doesn't have breaks the editor.
   */
  image?: MediaImageFragment | null
  /**
   * The image isn't the host's own, e.g. an office shows its location's: no
   * drop target, and no empty image while editing.
   */
  staticImage?: boolean
  // image: after the band. plain: without the image.
  variant: 'image' | 'plain'
  isEditing: boolean
  // Drupal's, from the main menu: it ends with the current page, without a
  // link.
  breadcrumb?: BreadcrumbFragment[]
  // The host is the container, e.g. the detail page's sidebar layout: none of
  // its own.
  contained?: boolean
}>()

const breadcrumbItems = computed(() =>
  (props.breadcrumb ?? []).map((item) => ({
    label: item.title,
    url: item.url.path || undefined,
  })),
)

const imageField = computed(() =>
  props.staticImage ? null : 'field_hero_image',
)

const hasImage = computed(
  () =>
    props.image !== undefined &&
    props.variant !== 'plain' &&
    (!!props.image || (props.isEditing && !props.staticImage)),
)
</script>
