<template>
  <div
    class="bk-field-list-item @container relative overflow-hidden w-120 min-w-[72px] aspect-[3/2] bg-white rounded-sm transition-opacity"
    :class="[
      isMuted ? 'opacity-30' : isShown ? 'opacity-100' : 'opacity-60',
      isSelected ? 'outline outline-2 outline-white outline-offset-2' : '',
    ]"
    :data-bk-uuid="uuid"
    :data-test-shown="isShown"
    data-test="field-pager-page"
  >
    <!--
      3:2, like the pictures in the add list's help (300 × 200). When the pages
      don't fit, they shrink from their width (not a flex-basis: browsers size
      the list by the width) down to their minimum width. The page gets no
      pointer events: in the editor, the canvas takes them, and selects the
      block whose element the page is.
    -->
    <!--
      Sized in cqw, percent of the page's width (the page is a container), so
      that it scales with the page. On a page 120px wide: a 24px icon and 12px
      text.
    -->
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-[4cqw] px-[4cqw] pt-[8cqw] bg-mono-50 text-mono-700"
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
import type { FieldPagerPageProps } from '../types'

const props = defineProps<FieldPagerPageProps>()

const { types } = useBlokkli()

const typeLabel = computed(
  () => types.getBlockBundleDefinition(props.bundle)?.label || props.bundle,
)
</script>
