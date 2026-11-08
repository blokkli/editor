<template>
  <div
    class="bk-styleguide-proxy"
    :class="{ 'bk-is-resizable': resizable }"
    :style="width ? { width: `${width}px` } : undefined"
  >
    <p class="bk-styleguide-proxy-text" @click="selected = null">
      The pool on the lake shore is open from May to September.
    </p>
    <div>
      <FieldPager
        v-model="shown"
        :label
        :items
        :selected-index="selected"
        :add-label
        @select="selected = $event"
        @add="add"
      />
      <div class="relative" @click="selected = current ? shown : null">
        <Slide v-if="current" :key="current.uuid" v-bind="current" />
        <div
          v-else
          class="h-[48px] outline-dashed outline-1 outline-accent-400/40 -outline-offset-1"
        />
        <div
          v-if="current && selected === shown"
          class="absolute inset-0 border-2 border-accent-600 pointer-events-none"
        />
      </div>
    </div>
    <p class="bk-styleguide-proxy-text" @click="selected = null">
      In bad weather the pool stays closed.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from '#imports'
import FieldPager from '#blokkli/editor/components/FieldPager/index.vue'
import type { FieldPagerItem } from '#blokkli/editor/components/FieldPager/types'
import Slide from '../Slide/index.vue'
import type { DemoSlide } from '../types'

const props = withDefaults(
  defineProps<{
    label: string
    slides: DemoSlide[]
    initial?: number
    /**
     * Whether the shown block starts selected.
     */
    selected?: boolean
    width?: number
    /**
     * Whether the container can be resized, at its bottom right corner.
     */
    resizable?: boolean
    addLabel?: string
    /**
     * Which types have a thumbnail.vue: all, none, or only teasers and images.
     */
    thumbnails?: 'all' | 'none' | 'some'
  }>(),
  {
    initial: 0,
    selected: false,
    width: undefined,
    resizable: false,
    addLabel: 'Add a slide',
    thumbnails: 'all',
  },
)

const slides = ref<DemoSlide[]>([...props.slides])
const shown = ref(props.initial)

/**
 * The index of the selected block. Clicking a block in the band shows and
 * selects it, clicking the slide selects the shown block, clicking the text
 * around clears the selection.
 */
const selected = ref<number | null>(
  props.selected && props.slides.length ? props.initial : null,
)

const current = computed(() => slides.value[shown.value])

function hasThumbnail(slide: DemoSlide): boolean {
  return (
    props.thumbnails === 'all' ||
    (props.thumbnails === 'some' && slide.bundle !== 'title')
  )
}

// The thumbnail of a type is what the site renders for it, here the mock.
const items = computed<FieldPagerItem[]>(() =>
  slides.value.map((slide) => ({
    uuid: slide.uuid,
    bundle: slide.bundle,
    thumbnail: hasThumbnail(slide) ? Slide : undefined,
    thumbnailProps: { ...slide, isThumbnail: true },
  })),
)

let added = 0

function add() {
  added++
  slides.value.push({
    uuid: `added-${added}`,
    bundle: 'teaser',
    title: `New teaser ${added}`,
    text: 'A teaser that was just added at the end.',
  })
  shown.value = slides.value.length - 1
  selected.value = shown.value
}
</script>

<style lang="postcss">
.bk-styleguide-proxy {
  max-width: 100%;
  font-family: var(--font-sans, 'Source Sans 3', sans-serif);

  &.bk-is-resizable {
    min-width: 240px;
    overflow: hidden;
    resize: horizontal;
    outline: 1px dashed var(--color-line, #d9d4cf);
    outline-offset: 4px;
  }
}

.bk-styleguide-proxy-text {
  margin: 0;
  padding: 12px 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--color-muted, #5c5652);
}
</style>
