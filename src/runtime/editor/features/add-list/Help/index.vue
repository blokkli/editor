<template>
  <div ref="rootEl" class="bk bk-add-list-help">
    <div ref="innerEl" class="bk-add-list-help-inner">
      <div class="bk-add-list-help-content">
        <HelpItemComponent
          v-for="item in items"
          :id="item.id"
          ref="itemRefs"
          :key="item.type + ':' + item.id"
          :is-visible="item.type === type && item.id === id"
          :type="item.type"
          :actions
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAnimationFrame } from '#blokkli/editor/composables'
import type { AddAction } from '#blokkli/editor/types/actions'
import type { BlockBundleDefinition } from '#blokkli/editor/types/definitions'
import { computed, ref, useTemplateRef, useBlokkli, watch } from '#imports'
import HelpItemComponent from './Item.vue'

type HelpItemData = {
  type: 'bundle' | 'action'
  id: string
}

const props = defineProps<{
  isVisible: boolean
  type?: 'bundle' | 'action'
  id?: string
  element?: HTMLElement
  actions: AddAction[]
  bundles: BlockBundleDefinition[]
}>()

const rootEl = useTemplateRef('rootEl')
const innerEl = useTemplateRef('innerEl')
const itemRefs = useTemplateRef('itemRefs')

// Target values (where we want to animate to).
const targetHeight = ref(200)
const targetY = ref(0)
const x = ref(200)

// Displayed values (current animated state).
const displayedHeight = ref(200)
const displayedY = ref(0)

// Track if we should skip animation (first show).
const skipAnimation = ref(true)

const { ui } = useBlokkli()

function updatePosition() {
  if (!props.element) {
    return
  }
  const rect = props.element.getBoundingClientRect()
  x.value = Math.round(rect.x + rect.width + 10)
  targetY.value = Math.round(
    Math.max(
      10,
      Math.min(
        rect.y - 55,
        ui.visibleViewport.value.height - targetHeight.value - 10,
      ),
    ),
  )
}

watch(() => props.element, updatePosition)
watch(targetHeight, updatePosition)

// When visibility changes from false to true, skip animation and set values immediately.
watch(
  () => props.isVisible,
  (isVisible, wasVisible) => {
    if (isVisible && !wasVisible) {
      skipAnimation.value = true
    }
  },
)

const items = computed<HelpItemData[]>(() => {
  const result: HelpItemData[] = []

  // Add all bundles.
  for (const bundle of props.bundles) {
    result.push({
      type: 'bundle',
      id: bundle.id,
    })
  }

  // Add all actions.
  for (const action of props.actions) {
    result.push({
      type: 'action',
      id: action.id,
    })
  }

  return result
})

const EASE_FACTOR = 0.22

function lerp(current: number, target: number, factor: number): number {
  const diff = target - current
  if (Math.abs(diff) < 0.5) {
    return target
  }
  return current + diff * factor
}

const visibleIndex = computed(() => {
  if (!props.type || !props.id) return -1
  return items.value.findIndex(
    (item) => item.type === props.type && item.id === props.id,
  )
})

useAnimationFrame(() => {
  // Don't run animation when not visible.
  if (!props.isVisible) {
    return
  }

  // Get the visible item's height.
  const index = visibleIndex.value
  if (index >= 0 && itemRefs.value) {
    const height = itemRefs.value[index]?.height
    if (height) {
      targetHeight.value = height
    }
  }

  // If skipping animation, set values immediately.
  if (skipAnimation.value) {
    displayedHeight.value = targetHeight.value
    displayedY.value = targetY.value
    skipAnimation.value = false
  } else {
    // Smoothly interpolate displayed values towards targets.
    displayedHeight.value = lerp(
      displayedHeight.value,
      targetHeight.value,
      EASE_FACTOR,
    )
    displayedY.value = lerp(displayedY.value, targetY.value, EASE_FACTOR)
  }

  // Directly set styles on elements.
  if (rootEl.value) {
    rootEl.value.style.transform = `translate(${x.value}px, ${displayedY.value}px)`
  }
  if (innerEl.value) {
    innerEl.value.style.height = `${displayedHeight.value}px`
  }
})
</script>

<style lang="postcss">
.bk.bk-add-list-help {
  @apply absolute top-0 left-0 z-add-list-info will-change-transform;
  @apply w-[750px];

  .bk-add-list-help-item {
    @apply p-15;
    @apply contain-paint;
    &:has(.bk-add-list-help-fields) {
      .bk-add-list-help-image {
        @apply mb-20;
      }
    }
  }
  .bk-add-list-help-label {
    @apply uppercase text-sm font-semibold text-mono-300 tracking-wider mb-10;
  }

  .bk-add-list-help-inner {
    @apply relative;
    @apply will-change-transform;
    @apply text-mono-50 bg-mono-950/90 backdrop-blur-md;
    @apply overflow-hidden;
  }

  .bk-add-list-help-content {
    @apply absolute top-0 left-0 right-0;
    @apply grid items-start;

    .bk-add-list-help-item {
      grid-area: 1 / 1;
    }
  }

  hr {
    @apply border-t border-t-mono-600 my-20;
  }

  h2 {
    @apply text-xl font-bold leading-none mb-5;
    @apply mb-20;
    @apply flex items-center gap-15;
  }
  .bk-add-list-help-description {
    @apply select-text text-base;
    p + p {
      @apply mt-15;
    }
  }

  .bk-add-list-help-image {
    @apply bg-white overflow-hidden;
    @apply float-right ml-20 w-300 h-200;
    @apply outline outline-1 outline-mono-700;

    &:has(.bk-blokkli-item-icon) {
      @apply flex items-center justify-center bg-mono-700;
    }

    .bk-blokkli-item-icon {
      @apply size-100;
      svg {
        @apply fill-mono-500;
      }
    }

    img {
      @apply border-0 size-full object-contain;
    }
  }

  .bk-add-list-help-fields-item {
    @apply flex flex-wrap;

    ul {
      @apply flex flex-wrap gap-x-15 gap-y-10;
    }

    li {
      &.bk-is-bundle {
        @apply inline-flex gap-5 text-mono-100 font-medium;
      }

      &.bk-is-field {
        @apply uppercase inline-block;
        @apply text-xs tracking-wide min-w-0;
        @apply rounded-md px-[8px] pt-[4px] pb-2;
        @apply border;
        @apply font-medium;
        @apply bg-mono-800/60;
        @apply text-mono-300;
        @apply border-mono-600;
      }
    }
  }
  .bk-add-list-help-fields-item + .bk-add-list-help-fields-item {
    @apply mt-20;
  }
}

.bk-add-list-help-enter-active,
.bk-add-list-help-leave-active {
  .bk-add-list-help-inner {
    @apply transition duration-200 ease-swing;
  }
}
.bk-add-list-help-enter-from,
.bk-add-list-help-leave-to {
}

.bk-add-list-help-enter-from {
  .bk-add-list-help-inner {
    @apply -translate-x-30;
    @apply opacity-0;
  }
}

.bk-add-list-help-leave-to {
  .bk-add-list-help-inner {
    @apply -translate-x-100;
    @apply opacity-0;
  }
}
</style>
