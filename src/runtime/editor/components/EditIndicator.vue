<template>
  <Teleport to="body">
    <button
      ref="button"
      class="bk-edit-indicator"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
      @click="$emit('edit')"
    >
      {{ label }}
    </button>

    <div v-show="isHovering" ref="overlay" class="bk-edit-indicator-overlay" />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  useState,
  computed,
  useTemplateRef,
} from '#imports'
import type { EditPermission } from '#blokkli/types/provider'

type IndicatorData = {
  key: string
  targetElement: HTMLElement
  buttonElement: HTMLButtonElement
}

/**
 * Hardcoded labels for the few permission states this component renders.
 * Inlined so the indicator can mount without pulling in the translation
 * provider (and its async chunk).
 */
const LABELS = {
  en: {
    edit: 'Edit blocks',
    review: 'Review changes',
    view: 'View changes',
  },
  de: {
    edit: 'Elemente bearbeiten',
    review: 'Änderungen überprüfen',
    view: 'Änderungen ansehen',
  },
  fr: {
    edit: 'Modifier les éléments',
    review: 'Examiner les modifications',
    view: 'Voir les modifications',
  },
  it: {
    edit: 'Modifica elementi',
    review: 'Esamina modifiche',
    view: 'Visualizza modifiche',
  },
} as const

type IndicatorLanguage = keyof typeof LABELS

function isIndicatorLanguage(value: string): value is IndicatorLanguage {
  return value in LABELS
}

const props = defineProps<{
  uuid: string
  language: string
  entityType: string
  editLabel?: string
  permissions: Array<EditPermission | null>
}>()

const key = computed(() => props.entityType + ':' + props.uuid)

const label = computed(() => {
  if (props.editLabel) {
    return props.editLabel
  }

  const lang = isIndicatorLanguage(props.language) ? props.language : 'en'
  const labels = LABELS[lang]

  if (props.permissions.includes('edit')) {
    return labels.edit
  } else if (props.permissions.includes('review')) {
    return labels.review
  } else if (props.permissions.includes('view')) {
    return labels.view
  }

  return null
})

defineEmits(['edit'])

let raf: any = null

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

function loop() {
  raf = window.requestAnimationFrame(loop)

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
}

onMounted(() => {
  loop()
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

  if (raf) {
    window.cancelAnimationFrame(raf)
    raf = null
  }
})
</script>

<style>
:root {
  --bk-edit-indicator-color: 5 80 230;
  --bk-edit-indicator-z-index: 1000000;
}

@font-face {
  font-family: 'PB Inter';
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
  font-named-instance: 'Regular';
  src: url('/_blokkli-assets/Inter.var.woff2') format('woff2');
}

.bk-edit-indicator {
  appearance: none !important;
  position: fixed !important;
  top: 0 !important;
  right: 15px !important;
  z-index: var(--bk-edit-indicator-z-index) !important;
  background: rgb(var(--bk-edit-indicator-color)) !important;
  color: white !important;
  cursor: pointer !important;
  height: 50px !important;
  padding: 0 20px !important;
  font-family: 'PB Inter', sans-serif !important;
  font-weight: bold !important;
  font-size: 16px !important;
  line-height: 16px !important;
}

.bk-edit-indicator-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  z-index: calc(var(--bk-edit-indicator-z-index) - 1) !important;
  background: rgb(var(--bk-edit-indicator-color) / 20%) !important;
  outline: 2px solid rgb(var(--bk-edit-indicator-color)) !important;
  outline-offset: -2px !important;
  pointer-events: none !important;
}
</style>
