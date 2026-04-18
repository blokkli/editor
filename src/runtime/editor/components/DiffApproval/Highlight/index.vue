<template>
  <Teleport to="#bk-canvas-overlay">
    <div class="bk bk-diff-approval-highlight" :style="containerStyle">
      <Item
        v-for="(item, i) in items"
        :key="item.id"
        ref="itemRefs"
        :uuid="item.uuid"
        :field-name="item.fieldName"
        :value="item.value"
        :selected="!!selected[item.id]"
        :active="i === activeIndex"
        @activate="activeIndex = i"
        @toggle="emit('toggle', item.id)"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef, useBlokkli } from '#imports'
import type { ApprovalItem } from '../types'
import Item from './Item.vue'

defineProps<{
  items: ApprovalItem[]
  selected: Record<number, boolean>
}>()

const emit = defineEmits<{
  (e: 'toggle', id: number): void
}>()

const activeIndex = defineModel<number>({ default: -1 })

const { ui } = useBlokkli()

const itemRefs = useTemplateRef('itemRefs')

const containerStyle = computed(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})

function updateRects() {
  if (itemRefs.value) {
    for (const item of itemRefs.value) {
      if (!item) {
        continue
      }
      item.updateRect()
    }
  }
}

defineExpose({ updateRects })
</script>

<style lang="postcss">
.bk.bk-diff-approval-highlight {
  @apply absolute top-0 left-0 pointer-events-auto;
  transform-origin: 0 0;

  .bk-diff-approval-highlight-item {
    @apply absolute top-0 left-0 rounded border border-mono-300;
    /* @apply outline outline-2 outline-mono-300/20; */
    &:not(.bk-is-active):hover {
      @apply border-mono-500 bg-mono-400/20;
    }
    &.bk-is-active {
      @apply border-4 outline-[5px];
      @apply rounded-tl-none;
    }

    &.bk-is-approved {
      @apply border-lime-normal outline-lime-normal/30;

      .bk-icon {
        @apply text-lime-normal;
      }
    }

    &.bk-is-rejected {
      @apply border-red-normal outline-red-normal/30;

      .bk-diff-approval-highlight-item-badge {
        @apply bg-red-normal;
      }

      .bk-icon {
        @apply text-red-normal;
      }
    }

    .bk-diff-approval-highlight-item-area {
      @apply size-full block;
    }

    .bk-diff-approval-highlight-item-badge {
      @apply absolute left-[-3px] bottom-full h-30;
      @apply bg-lime-normal text-white;
      @apply rounded-t-md;
      @apply px-8;

      > span {
        @apply text-xs font-semibold uppercase tracking-wider leading-none translate-y-1;
      }

      @apply flex items-center justify-center gap-5;

      .bk-icon {
        @apply size-18 bg-white rounded flex items-center justify-center;
      }

      svg {
        @apply size-15 fill-current;
      }
    }
  }
}
</style>
