<template>
  <div
    class="grid gap-grid"
    :class="{ 'md:grid-cols-2': shownIndex === null }"
    data-test="story-scene"
    data-test-layout="images"
  >
    <!--
      Every image section stays rendered; while editing, the ones the field
      doesn't show are hidden. A class, not v-show: on a page rendered on the
      server, the CSP blocks the style attribute that v-show renders.
    -->
    <BlokkliItem v-for="item in images" :key="item.uuid" v-bind="item">
      <figure
        :class="{ hidden: shownUuid !== null && item.uuid !== shownUuid }"
        data-test="story-section"
        :data-test-uuid="item.uuid"
      >
        <MediaImage
          v-if="item.props.media"
          v-bind="item.props.media"
          img-class="aspect-[3/2] w-full object-cover"
        />
        <figcaption
          v-if="item.props.caption || isEditing"
          v-blokkli-editable:field_caption
          :data-placeholder="$texts('placeholder.caption', 'Caption')"
          class="editable-placeholder mt-2 text-small text-muted"
        >
          {{ item.props.caption }}
        </figcaption>
      </figure>
    </BlokkliItem>
    <!--
      A section this layout can't show, while it's shown: its own type, nested
      in the story, as the field renders its blocks.
    -->
    <BlokkliItem v-if="otherShown" :key="otherShown.uuid" v-bind="otherShown" />
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

type ImageItem = Extract<FieldListItemTyped, { bundle: 'image' }>

// The image sections only, side by side. While editing, the field shows one
// section at a time.
const props = defineProps<{
  items: FieldListItemTyped[]
  shownIndex: number | null
}>()

const isEditing = import.meta.blokkliEditing

const images = computed(() =>
  props.items.filter((item): item is ImageItem => item.bundle === 'image'),
)

const shown = computed(() =>
  props.shownIndex === null ? null : (props.items[props.shownIndex] ?? null),
)

const shownUuid = computed(() => shown.value?.uuid ?? null)

const otherShown = computed(() =>
  shown.value && shown.value.bundle !== 'image' ? shown.value : null,
)
</script>
