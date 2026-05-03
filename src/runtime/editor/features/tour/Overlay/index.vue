<template>
  <Teleport v-if="activeItem" :to="ui.mainLayoutElement.value">
    <div class="bk bk-tour" :style="tooltipStyle">
      <div class="bk-tour-inner">
        <div class="bk-tour-title">
          <span>{{ activeItem.title }}</span>
          <button @click.prevent="$emit('close')">
            <Icon name="bk_mdi_close" />
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
      <div
        class="border-t h-50 absolute bottom-0 left-0 w-full bg-white border-t-yellow-dark/20 flex justify-between items-center"
      >
        <button class="bk-tour-button group/tooltip" @click.stop.prevent="prev">
          <Icon name="bk_mdi_chevron_backward" />
          <span>{{ $t('tourPrev', 'Previous') }}</span>
          <Tooltip
            :label="$t('arrowRight', 'Arrow Right')"
            placement="below-left"
          >
            <template #shortcut>
              <ShortcutIndicator label="Prev Tour Item" key-code="ArrowLeft" />
            </template>
          </Tooltip>
        </button>
        <div class="text-yellow-dark/80 text-sm">
          <span>{{ activeIndex + 1 }}</span
          >&nbsp;/
          <span>{{ items.length }}</span>
        </div>
        <button class="bk-tour-button group/tooltip" @click.stop.prevent="next">
          <span>{{ $t('tourNext', 'Next') }}</span>
          <Icon name="bk_mdi_chevron_forward" />
          <Tooltip
            :label="$t('arrowLeft', 'Arrow Left')"
            placement="below-right"
          >
            <template #shortcut>
              <ShortcutIndicator label="Next Tour Item" key-code="ArrowRight" />
            </template>
          </Tooltip>
        </button>
      </div>
    </div>
    <div :style="rectStyle" class="bk bk-tour-overlay-element" />
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, computed, ref, useTemplateRef } from '#imports'
import { falsy } from '#blokkli/helpers'
import { modulo } from '#blokkli/editor/helpers/math'
import { Icon, ShortcutIndicator, Tooltip } from '#blokkli/editor/components'
import { onBlokkliEvent, useAnimationFrame } from '#blokkli/editor/composables'

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
const contentEl = useTemplateRef('contentEl')

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

const activeItem = computed<PositionedTourItem>(
  () => items.value[activeIndex.value]!,
)

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

  return sortedSpaces[0]![0]
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
  if (ui.hasDialogOpen.value) {
    return
  }

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

<style lang="postcss">
.bk.bk-tour {
  @apply fixed z-tour-item top-0 left-0 rounded;
  @apply bg-white shadow-xl transition-all duration-200 ease-swing text-yellow-dark pointer-events-auto;

  button {
    @apply focus:outline-0 focus:ring-0 focus:border-0;
  }
}

.bk {
  .bk-tour-title {
    @apply font-bold text-lg pl-20 border-b border-b-yellow-dark/30 flex items-center justify-between bg-yellow-normal;

    button {
      @apply p-15 hover:bg-yellow-dark/10;
      svg {
        @apply fill-yellow-dark;
      }
    }

    svg {
      @apply w-20 h-20;
    }
  }
  .bk-tour-content {
    @apply p-20 pt-[17px];

    > div {
      @apply relative ease-swing transition-all overflow-hidden;
    }

    p:not(:last-child) {
      @apply mb-18;
    }
  }
  .bk-tour-content-text {
    @apply absolute top-0 left-0 w-full;
  }
  .bk-tour-button {
    @apply text-yellow-dark font-semibold py-15 px-15 flex items-center leading-none hover:bg-yellow-dark/5 relative;

    .bk-icon {
      @apply w-20 h-20;
      svg {
        @apply fill-current;
      }
    }
  }
}

.bk.bk-tour-overlay-element {
  @apply fixed top-0 left-0 w-full h-full z-tour-overlay pointer-events-none;
  @apply border-3 border-yellow-normal transition-all duration-200 ease-swing;
  @apply ring-yellow-light/80 ring-1 bg-yellow-normal/30;
}
</style>
