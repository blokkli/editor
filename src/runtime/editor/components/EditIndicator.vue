<template>
  <Teleport to="body">
    <div class="bk">
      <button
        ref="button"
        class="bk-edit-indicator bk-button bk-is-primary"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
        @click="$emit('edit')"
      >
        {{ label }}
      </button>

      <div
        v-show="isHovering"
        ref="overlay"
        class="bk-edit-indicator-overlay"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import textProvider from '#blokkli/editor/providers/texts'
import {
  ref,
  onMounted,
  onBeforeUnmount,
  useState,
  computed,
  useTemplateRef,
} from '#imports'
import '#blokkli-build/styles.css'
import { useAnimationFrame } from '#blokkli/editor/composables'
import type { EditPermission } from '#blokkli/types/provider'

type IndicatorData = {
  key: string
  targetElement: HTMLElement
  buttonElement: HTMLButtonElement
}

const props = defineProps<{
  uuid: string
  entityType: string
  editLabel?: string
  permissions: Array<EditPermission | null>
}>()

const key = computed(() => props.entityType + ':' + props.uuid)

const $t = await textProvider()

const label = computed(() => {
  if (props.editLabel) {
    return props.editLabel
  } else if (props.permissions.includes('edit')) {
    return $t('editIndicatorLabel', 'Edit blocks')
  } else if (props.permissions.includes('review')) {
    return $t('editIndicatorLabelReview', 'Review changes')
  } else if (props.permissions.includes('view')) {
    return $t('editIndicatorLabelView', 'View changes')
  }

  return null
})

defineEmits(['edit'])

const isHovering = ref(false)

const button = useTemplateRef('button')
const overlay = useTemplateRef('overlay')
const targetElement = ref<HTMLElement | null>(null)

// Shared state for all indicators.
const indicatorRegistry = useState<IndicatorData[]>(
  'blokkliEditIndicators',
  () => [],
)

// This component is the manager if it's the first in the array (index 0)
const isManager = computed(() => {
  return indicatorRegistry.value[0]?.key === key.value
})

function calculateIdealYPosition(
  buttonHeight: number,
  bounds: DOMRect,
  gap: number,
) {
  const elementHeight = bounds.bottom - bounds.top

  // For small elements (< 100px), center the button vertically.
  let position
  if (elementHeight < 100) {
    position = bounds.top + elementHeight / 2 - buttonHeight / 2
  } else {
    // For larger elements, start at GAP from top.
    position = bounds.top + gap
  }

  // Stick to viewport top (like position: sticky, top: GAP).
  position = Math.max(position, gap)

  // But stick to element bottom when element is scrolling out.
  return Math.min(position, bounds.bottom - buttonHeight - gap)
}

const GAP = 15

const indicators = computed(() => {
  const indicators = [...indicatorRegistry.value]

  // Sort by document order (DOM position, not visual position).
  return indicators.sort((a, b) => {
    const position = a.targetElement.compareDocumentPosition(b.targetElement)

    // DOCUMENT_POSITION_FOLLOWING means B comes after A in the document.
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1
    }
    // DOCUMENT_POSITION_PRECEDING means B comes before A in the document.
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1
    }
    return 0
  })
})

function updateAllIndicatorPositions() {
  const positions: number[] = []
  const heights: number[] = []

  for (let i = 0; i < indicators.value.length; i++) {
    const data = indicators.value[i]!
    const rect = data.targetElement.getBoundingClientRect()
    const buttonHeight = data.buttonElement.offsetHeight

    let idealY = calculateIdealYPosition(buttonHeight, rect, GAP)

    // Collision detection to prevent overlapping indicator buttons.
    for (let j = 0; j < i; j++) {
      const prevRect =
        indicators.value[j]!.targetElement.getBoundingClientRect()
      const prevElementTop = prevRect.top
      const prevElementHeight = prevRect.height
      const collisionPosition = prevElementTop + prevElementHeight + GAP

      // If this button would overlap, push it down.
      if (idealY < collisionPosition) {
        idealY = collisionPosition
      }
    }

    const elementBottom = rect.bottom - buttonHeight - GAP
    if (elementBottom < idealY) {
      idealY = elementBottom
    }

    idealY = Math.round(idealY)

    positions.push(idealY)
    heights.push(buttonHeight)
    data.buttonElement.style.transform = `translateY(${idealY}px)`
  }
}

onMounted(() => {
  const el = document.querySelector(`[data-provider-uuid="${props.uuid}"]`)
  if (el && el instanceof HTMLElement) {
    targetElement.value = el
  }

  // Register this indicator
  if (button.value && targetElement.value) {
    indicatorRegistry.value.push({
      key: key.value,
      targetElement: targetElement.value,
      buttonElement: button.value,
    })
  }
})

onBeforeUnmount(() => {
  indicatorRegistry.value = indicatorRegistry.value.filter(
    (i) => i.key !== key.value,
  )
})

useAnimationFrame(() => {
  if (!button.value || !targetElement.value) {
    return
  }

  // The first indicator is the "manager" and is responsible for updating all
  // indicator positions.
  if (isManager.value) {
    updateAllIndicatorPositions()
  }

  // Each component handles its own overlay
  if (isHovering.value && overlay.value) {
    const rect = targetElement.value.getBoundingClientRect()
    overlay.value.style.width = rect.width + 'px'
    overlay.value.style.height = rect.height + 'px'
    overlay.value.style.transform = `translate(${rect.x}px, ${rect.y}px)`
  }
})
</script>
