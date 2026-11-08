<template>
  <div
    class="bk bk-skip-analyze flex items-center gap-10 px-10 bg-mono-900 border-b border-b-mono-700 text-mono-400 font-sans select-none"
    aria-hidden="true"
    data-test="field-pager"
  >
    <!-- The label of the field, cut off when it's long, and the shown block. -->
    <div class="flex flex-col gap-3 shrink-0 max-w-100">
      <span class="text-xs font-medium uppercase tracking-wide truncate">
        {{ label }}
      </span>
      <span
        v-if="items.length && shownIndex !== null"
        class="text-sm tabular-nums whitespace-nowrap"
        data-test="field-pager-count"
      >
        <span class="font-semibold text-white">{{ shownIndex + 1 }}</span>
        / {{ items.length }}
      </span>
    </div>

    <!--
      The room next to the label. The list hugs its pages, so that the field's
      rectangle ends after the last one; without pages, it fills the room and is
      as high as a page. Padding, so that the outline of the selected page isn't
      clipped.
    -->
    <div ref="room" class="flex flex-1 min-w-0">
      <div
        ref="list"
        class="flex items-center gap-10 min-w-0 py-10 px-5"
        :class="items.length ? '' : 'flex-1 h-100'"
        data-test="field-pager-pages"
      >
        <template v-for="(item, i) in visibleItems" :key="item.uuid">
          <slot
            name="page"
            v-bind="{
              ...item,
              index: i,
              isShown: i === shownIndex,
              isSelected: i === selectedIndex,
            }"
          >
            <Page
              v-bind="item"
              :index="i"
              :is-shown="i === shownIndex"
              :is-selected="i === selectedIndex"
            />
          </slot>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from '#imports'
import { onElementResize } from '#blokkli/editor/composables'
import Page from './Page/index.vue'
import type { FieldPagerItem, FieldPagerPageProps } from './types'

/**
 * The smallest width of a page, and the gap between pages.
 */
const PAGE_MIN_WIDTH = 72
const PAGE_GAP = 10

/**
 * The list's padding, left and right.
 */
const LIST_PADDING = 10

const props = withDefaults(
  defineProps<{
    /**
     * The label of the field, e.g. "Slides".
     */
    label: string

    /**
     * The blocks of the field, in their order.
     */
    items: FieldPagerItem[]

    /**
     * The index of the block that the field shows.
     */
    shownIndex?: number | null

    /**
     * The index of the block that is selected or holds the selection.
     */
    selectedIndex?: number | null
  }>(),
  {
    shownIndex: null,
    selectedIndex: null,
  },
)

defineSlots<{
  /**
   * A page. Without the slot, a plain one.
   */
  page?(props: FieldPagerPageProps): unknown
}>()

const room = useTemplateRef('room')
const list = useTemplateRef('list')

/**
 * How many pages fit next to the label at their smallest, once measured.
 */
const capacity = ref<number | null>(null)

onElementResize(room, ({ width }) => {
  capacity.value = Math.max(
    1,
    Math.floor((width - LIST_PADDING + PAGE_GAP) / (PAGE_MIN_WIDTH + PAGE_GAP)),
  )
})

/**
 * The pages that fit. The others are cut off: they aren't rendered, so that
 * no block's element lies outside the band, where the editor would still find
 * it under the pointer.
 */
const visibleItems = computed<FieldPagerItem[]>(() =>
  capacity.value === null ? [] : props.items.slice(0, capacity.value),
)

// The list is the element of the field, which the editor registers. Like the
// `blokkliDraggable` that blocks expose for their own registration.
defineExpose({ list })
</script>
