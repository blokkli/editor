<template>
  <div
    role="button"
    tabindex="0"
    class="@container relative overflow-hidden w-120 min-w-[72px] aspect-[3/2] bg-white rounded-sm cursor-pointer transition-opacity hover:opacity-100"
    :class="[
      isShown ? 'opacity-100' : 'opacity-60',
      isSelected
        ? 'outline outline-2 outline-white outline-offset-2'
        : 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mono-400 focus-visible:outline-offset-2',
    ]"
    :title="typeLabel"
    :aria-label="`${index + 1}: ${typeLabel}`"
    :aria-current="isShown ? 'true' : undefined"
    data-test="field-pager-page"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <!--
      3:2, like the pictures in the add list's help (300 × 200). When the pages
      don't fit, they shrink from their width (not a flex-basis: browsers size
      the list by the width) down to their minimum width; from there, they
      scroll sideways.
    -->
    <Thumbnail v-if="thumbnail">
      <Component :is="thumbnail" v-bind="thumbnailProps" />
    </Thumbnail>
    <!--
      Sized in cqw, percent of the page's width (the page is a container), so
      that it scales with the page, like a thumbnail. On a page 120px wide: a
      24px icon and 12px text.
    -->
    <div
      v-else
      class="absolute inset-0 flex flex-col items-center justify-center gap-[4cqw] px-[4cqw] pt-[8cqw] bg-mono-50 text-mono-700"
      data-test="field-pager-fallback"
    >
      <ItemIcon :bundle class="size-[20cqw] text-mono-500" />
      <span
        class="max-w-full text-[10cqw] leading-tight font-semibold truncate"
      >
        {{ typeLabel }}
      </span>
    </div>
    <Pill
      class="absolute top-5 left-5"
      :text="index + 1"
      :scheme="isShown ? 'accent' : 'mono'"
      :variant="isShown ? 'normal' : 'dark'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { ItemIcon } from '#blokkli/editor/components'
import Pill from '#blokkli/editor/components/Pill/index.vue'
import Thumbnail from '../Thumbnail/index.vue'
import type { FieldPagerItem } from '../types'

const props = defineProps<
  FieldPagerItem & {
    /**
     * The index of the block in its field.
     */
    index: number

    /**
     * Whether the field shows the block.
     */
    isShown: boolean

    /**
     * Whether the block is selected or contains the selection.
     */
    isSelected: boolean
  }
>()

const emit = defineEmits<{
  select: []
}>()

const { types } = useBlokkli()

const typeLabel = computed(
  () => types.getBlockBundleDefinition(props.bundle)?.label || props.bundle,
)
</script>
