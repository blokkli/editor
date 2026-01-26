<template>
  <div ref="rootEl" class="bk bk-add-list-help">
    <div ref="innerEl" class="bk-add-list-help-inner">
      <div ref="contentEl" class="bk-add-list-help-content">
        <HelpItem
          v-for="item in items"
          v-show="item.type === type && item.id === id"
          :id="item.id"
          :key="item.type + ':' + item.id"
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
import HelpItem from './Item.vue'

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
const contentEl = useTemplateRef('contentEl')

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

useAnimationFrame(() => {
  // Don't run animation when not visible.
  if (!props.isVisible) {
    return
  }

  // Measure the content element's actual height.
  if (contentEl.value) {
    const rect = contentEl.value.getBoundingClientRect()
    targetHeight.value = rect.height
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
