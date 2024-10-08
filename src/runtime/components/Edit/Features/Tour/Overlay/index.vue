<template>
  <Teleport v-if="activeItem" to="body">
    <div class="bk bk-tour" :style="tooltipStyle">
      <div class="bk-tour-inner">
        <div class="bk-tour-title">
          <span>{{ activeItem.title }}</span>
          <button @click.prevent="$emit('close')">
            <Icon name="close" />
          </button>
        </div>
        <div class="bk-tour-content">
          <div
            :style="{
              height: tooltipHeight + 'px',
            }"
          >
            <div
              ref="contentEl"
              class="bk-tour-content-text"
              v-html="activeItem.text"
            />
          </div>
        </div>
      </div>
      <div class="bk-tour-buttons">
        <button @click.stop.prevent="prev">
          <Icon name="chevron-left" />
          <span>{{ $t('tourPrev', 'Previous') }}</span>
          <div class="bk-tooltip">
            <span>Arrow Right</span>
            <ShortcutIndicator label="Prev Tour Item" key-code="ArrowLeft" />
          </div>
        </button>
        <div>
          <span>{{ activeIndex + 1 }}</span
          >&nbsp;/
          <span>{{ items.length }}</span>
        </div>
        <button @click.stop.prevent="next">
          <span>{{ $t('tourNext', 'Next') }}</span>
          <Icon name="chevron-right" />
          <div class="bk-tooltip">
            <span>Arrow Left</span>
            <ShortcutIndicator label="Next Tour Item" key-code="ArrowRight" />
          </div>
        </button>
      </div>
    </div>
    <div :style="rectStyle" class="bk bk-tour-overlay-element" />
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, computed, ref } from '#imports'
import { falsy, modulo } from '#blokkli/helpers'
import { Icon, ShortcutIndicator } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import useAnimationFrame from '#blokkli/helpers/composables/useAnimationFrame'

const emit = defineEmits(['close'])

type ItemPosition = 'top' | 'left' | 'bottom' | 'right'

const rectStyle = computed(() => {
  return {
    width: activeItem.value.rect.width + 'px',
    height: activeItem.value.rect.height + 'px',
    transform: `translate(${activeItem.value.rect.x}px, ${activeItem.value.rect.y}px)`,
  }
})

const tooltipStyle = computed(() => {
  const x = Math.max(
    Math.min(
      activeItem.value.x - tooltipWidth.value / 2,
      ui.visibleViewportPadded.value.x +
        ui.visibleViewportPadded.value.width -
        tooltipWidth.value,
    ),
    ui.visibleViewportPadded.value.x,
  )
  const y = Math.max(
    Math.min(
      activeItem.value.y - tooltipHeight.value / 2,
      ui.visibleViewportPadded.value.y +
        ui.visibleViewportPadded.value.height -
        tooltipHeight.value -
        100,
    ),
    ui.visibleViewportPadded.value.y,
  )
  return {
    width: tooltipWidth.value + 'px',
    transform: `translate(${x}px, ${y}px)`,
  }
})

const { tour, ui, $t } = useBlokkli()

const activeIndex = ref(0)
const contentEl = ref<HTMLDivElement | null>(null)

const tooltipHeight = ref(100)
const tooltipWidth = computed(() => {
  return ui.isMobile.value ? Math.min(window.innerWidth - 20, 400) : 400
})

type PositionedTourItem = {
  id: string
  title: string
  text: string
  rect: DOMRect
  x: number
  y: number
  position: ItemPosition
}

function calculateCenterPoint(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.x,
    y: rect.y,
  }
}

const viewportCenter = computed(() => ({
  x: ui.viewport.value.width / 2,
  y: ui.viewport.value.height / 2,
}))

const items = computed<PositionedTourItem[]>(() =>
  tour
    .getTourItems()
    .map((item) => {
      if (!item.element) {
        return
      }
      const element =
        typeof item.element === 'function' ? item.element() : item.element
      if (!(element instanceof HTMLElement)) {
        return
      }
      const rect = element.getBoundingClientRect()
      const { x, y, position } = calculatePosition(rect)
      return {
        position,
        id: item.id,
        rect,
        title: item.title,
        text: item.text,
        x,
        y,
      }
    })
    .filter(falsy)
    .sort((a, b) => {
      const centerA = calculateCenterPoint(a.rect)
      const centerB = calculateCenterPoint(b.rect)

      const angleA = Math.atan2(
        centerA.y - viewportCenter.value.y,
        centerA.x - viewportCenter.value.x,
      )
      const angleB = Math.atan2(
        centerB.y - viewportCenter.value.y,
        centerB.x - viewportCenter.value.x,
      )

      return angleA - angleB
    }),
)

const activeItem = computed(() => items.value[activeIndex.value])

const prev = () => {
  activeIndex.value = modulo(activeIndex.value - 1, items.value.length)
}

const next = () => {
  activeIndex.value = modulo(activeIndex.value + 1, items.value.length)
}

const getIdealPosition = (rect: DOMRect): ItemPosition => {
  if (rect.y < 20) {
    return 'bottom'
  } else if (
    rect.y >
    ui.visibleViewportPadded.value.y + ui.visibleViewportPadded.value.height
  ) {
    return 'top'
  }

  // Calculate available space around the element
  const availableSpace: Record<ItemPosition, number> = {
    top: rect.top,
    bottom: ui.visibleViewportPadded.value.height - rect.bottom,
    left: rect.left,
    right: ui.viewport.value.width - rect.right,
  }

  // Determine the best position for the tooltip
  const sortedSpaces = (
    Object.entries(availableSpace) as [ItemPosition, number][]
  ).sort((a, b) => b[1] - a[1])

  return sortedSpaces[0][0]
}

function calculatePosition(rect: DOMRect): {
  x: number
  y: number
  position: ItemPosition
} {
  const position = getIdealPosition(rect)

  switch (position) {
    case 'top':
      return {
        position,
        y: ui.viewport.value.height,
        x: rect.x + rect.width / 2,
      }
    case 'bottom':
      return {
        position,
        x: rect.x + rect.width / 2,
        y: rect.bottom,
      }
    case 'left':
      return {
        position,
        y: rect.y + rect.height / 2,
        x: rect.x,
      }
  }

  return {
    position,
    x: rect.right + 20,
    y: Math.max(rect.top, 70),
  }
}

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Tab') {
    e.originalEvent.preventDefault()
    if (e.shift) {
      prev()
    } else {
      next()
    }
  } else if (e.code === 'Escape') {
    e.originalEvent.preventDefault()
    emit('close')
  } else if (e.code === 'ArrowLeft') {
    e.originalEvent.preventDefault()
    prev()
  } else if (e.code === 'ArrowRight') {
    e.originalEvent.preventDefault()
    next()
  }
})

useAnimationFrame(() => {
  if (!contentEl.value) {
    return
  }

  tooltipHeight.value = contentEl.value.scrollHeight + 50
})
</script>
