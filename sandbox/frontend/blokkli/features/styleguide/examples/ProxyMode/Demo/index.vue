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
        :label
        :items
        :shown-index="current ? shown : null"
        :selected-index="selected"
      >
        <template #page="page">
          <Page
            v-bind="page"
            class="cursor-pointer"
            @click="show(page.index)"
          />
        </template>
      </FieldPager>
      <div class="relative" @click="selected = current ? shown : null">
        <Slide v-if="current" :key="current.uuid" v-bind="current" />
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
import Page from '#blokkli/editor/components/FieldPager/Page/index.vue'
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
  }>(),
  {
    initial: 0,
    selected: false,
    width: undefined,
    resizable: false,
  },
)

const shown = ref(props.initial)

/**
 * The index of the selected block. Clicking a page shows and selects its block
 * (in the editor, the canvas does that), clicking the slide selects the shown
 * block, clicking the text around clears the selection.
 */
const selected = ref<number | null>(
  props.selected && props.slides.length ? props.initial : null,
)

const current = computed(() => props.slides[shown.value])

const items = computed<FieldPagerItem[]>(() =>
  props.slides.map((slide) => ({ uuid: slide.uuid, bundle: slide.bundle })),
)

function show(index: number) {
  shown.value = index
  selected.value = index
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
