<template>
  <div
    class="bk flex items-center gap-10 px-10 bg-mono-900 border-b border-b-mono-700 text-mono-400 font-sans select-none"
    data-test="field-pager"
  >
    <!-- The label of the field, cut off when it's long, and the shown block. -->
    <div class="flex flex-col gap-3 shrink-0 max-w-100">
      <span
        class="text-xs font-medium uppercase tracking-wide truncate"
        :title="label"
      >
        {{ label }}
      </span>
      <span
        v-if="items.length"
        class="text-sm tabular-nums whitespace-nowrap"
        data-test="field-pager-count"
      >
        <span class="font-semibold text-white">{{ shown + 1 }}</span>
        / {{ items.length }}
      </span>
    </div>

    <!-- Padding, so that the outline of the selected page isn't clipped. -->
    <div
      v-if="items.length"
      ref="list"
      class="relative flex items-center gap-10 min-w-0 overflow-x-auto py-10 px-5 [scrollbar-width:none]"
      data-test="field-pager-pages"
    >
      <Page
        v-for="(item, i) in items"
        :key="item.uuid"
        v-bind="item"
        :index="i"
        :is-shown="i === shown"
        :is-selected="i === selectedIndex"
        @select="onSelect(i)"
      />
    </div>

    <!--
      As high as the pages: stretched, minus their padding. Without pages, as
      high as a page.
    -->
    <button
      v-if="addLabel"
      type="button"
      class="flex items-center justify-center shrink-0 self-stretch w-40 my-10 border border-dashed border-mono-500 rounded-sm text-mono-300 cursor-pointer hover:border-mono-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mono-400 focus-visible:outline-offset-2"
      :class="items.length ? '' : 'h-80'"
      :title="addLabel"
      :aria-label="addLabel"
      data-test="field-pager-add"
      @click="emit('add')"
    >
      <Icon name="bk_mdi_add" class="size-24" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from '#imports'
import { Icon } from '#blokkli/editor/components'
import Page from './Page/index.vue'
import type { FieldPagerItem } from './types'

withDefaults(
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
     * The index of the block that is selected or contains the selection.
     */
    selectedIndex?: number | null

    /**
     * The label of the button that adds a block at the end. Without it, there
     * is no such button.
     */
    addLabel?: string
  }>(),
  {
    selectedIndex: null,
    addLabel: '',
  },
)

/**
 * The index of the block that the field shows.
 */
const shown = defineModel<number>({ default: 0 })

const emit = defineEmits<{
  add: []
  select: [index: number]
}>()

const list = useTemplateRef('list')

function onSelect(index: number) {
  shown.value = index
  emit('select', index)
}

/**
 * Scrolls the pages, when they overflow, so that the shown one is in view,
 * with the padding of the list around it for the outline.
 */
function revealShown(behavior: ScrollBehavior) {
  const el = list.value
  const page = el?.children[shown.value]
  if (!el || !(page instanceof HTMLElement)) {
    return
  }

  const padding = parseFloat(getComputedStyle(el).paddingLeft) || 0
  const left = page.offsetLeft - padding
  const right = page.offsetLeft + page.offsetWidth + padding - el.clientWidth

  if (el.scrollLeft > left) {
    el.scrollTo({ left, behavior })
  } else if (el.scrollLeft < right) {
    el.scrollTo({ left: right, behavior })
  }
}

onMounted(() => revealShown('auto'))

// The parent changes the shown block too, e.g. to one it just added.
watch(shown, () => revealShown('smooth'), { flush: 'post' })
</script>
