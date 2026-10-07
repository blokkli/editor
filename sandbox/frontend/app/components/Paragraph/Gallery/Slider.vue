<template>
  <div>
    <div
      ref="track"
      class="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
    >
      <figure
        v-for="slide in slides"
        :key="slide.uuid"
        class="w-full shrink-0 snap-center"
      >
        <MediaImage
          v-if="slide.media"
          v-bind="slide.media"
          img-class="aspect-[3/2] w-full object-cover"
        />
        <figcaption v-if="slide.caption" class="mt-2 text-small text-muted">
          {{ slide.caption }}
        </figcaption>
      </figure>
    </div>
    <div
      v-if="slides.length > 1"
      class="mt-3 flex justify-end gap-2"
      :class="{ 'pointer-events-none': isEditing }"
    >
      <button
        type="button"
        class="flex size-11 items-center justify-center border border-line hover:border-ink"
        :aria-label="$texts('gallery.previous_image', 'Previous image')"
        @click="scroll(-1)"
      >
        <SpriteSymbol name="arrow-left" class="size-5" />
      </button>
      <button
        type="button"
        class="flex size-11 items-center justify-center border border-line hover:border-ink"
        :aria-label="$texts('gallery.next_image', 'Next image')"
        @click="scroll(1)"
      >
        <SpriteSymbol name="arrow-right" class="size-5" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'

// The slides are rendered directly, not as blocks: in proxy mode, the editor
// shows the image blocks in its own list (Image/proxy.vue).
const props = defineProps<{
  items: FieldListItemTyped[]
  isEditing: boolean
}>()

const track = useTemplateRef('track')

const slides = computed(() =>
  props.items.flatMap((item) =>
    item.bundle === 'image' ? [{ uuid: item.uuid, ...item.props }] : [],
  ),
)

function scroll(direction: 1 | -1) {
  const element = track.value
  if (element) {
    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: 'smooth',
    })
  }
}
</script>
