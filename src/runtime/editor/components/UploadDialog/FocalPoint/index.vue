<template>
  <div class="w-[160px] shrink-0">
    <div
      class="w-[160px] h-120 flex items-center justify-center overflow-hidden bg-mono-200"
    >
      <div
        class="relative cursor-crosshair touch-none select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-700"
        :class="size ? '' : 'invisible'"
        :style="
          size
            ? { width: size.width + 'px', height: size.height + 'px' }
            : undefined
        "
        role="slider"
        tabindex="0"
        :aria-label="label"
        :aria-valuetext="valueText"
        data-test="upload-focal-point"
        :data-test-value="formatFocalPoint(point)"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @lostpointercapture="onPointerEnd"
        @keydown="onKeyDown"
      >
        <img
          ref="image"
          :src
          alt=""
          draggable="false"
          class="block size-full"
          @load="onLoad"
          @error="emit('error')"
        />
        <span
          class="absolute size-20 -ml-10 -mt-10 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(0_0_0/0.5)] pointer-events-none"
          :style="{ left: point.x + '%', top: point.y + '%' }"
        />
      </div>
    </div>
    <p class="mt-5 text-xs text-mono-500">
      {{ $t('uploadFocalPoint', 'Click the image to set its focal point.') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli, useTemplateRef } from '#imports'
import {
  formatFocalPoint,
  moveFocalPoint,
  parseFocalPoint,
  toPercent,
} from '../focalPoint'

defineProps<{
  /**
   * The image's URL.
   */
  src: string
  /**
   * The focal point's name, for assistive technology.
   */
  label: string
}>()

const emit = defineEmits<{
  /**
   * The image can't be shown.
   */
  (e: 'error'): void
}>()

/**
 * The focal point, as "x,y".
 */
const value = defineModel<unknown>()

const { $t, ui } = useBlokkli()

const image = useTemplateRef('image')

const point = computed(() => parseFocalPoint(value.value))

const valueText = computed(() =>
  [point.value.x, point.value.y]
    .map((offset) => ui.formatNumber(offset / 100, { style: 'percent' }))
    .join(', '),
)

// The size of the files' previews.
const BOX_WIDTH = 160
const BOX_HEIGHT = 120

/**
 * The image's size: it fits the preview, as the other previews' images do.
 * The point is placed on the image, not on the preview around it.
 */
const size = ref<{ width: number; height: number } | null>(null)

function onLoad() {
  const width = image.value?.naturalWidth
  const height = image.value?.naturalHeight
  if (!width || !height) {
    size.value = { width: BOX_WIDTH, height: BOX_HEIGHT }
    return
  }
  const scale = Math.min(BOX_WIDTH / width, BOX_HEIGHT / height)
  size.value = { width: width * scale, height: height * scale }
}

let isDragging = false

function setFromPointer(e: PointerEvent) {
  const rect = image.value?.getBoundingClientRect()
  if (!rect?.width || !rect.height) {
    return
  }
  value.value = formatFocalPoint({
    x: toPercent((e.clientX - rect.left) / rect.width),
    y: toPercent((e.clientY - rect.top) / rect.height),
  })
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) {
    return
  }
  // The point follows the pointer until it's released, even outside the image.
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  isDragging = true
  setFromPointer(e)
}

function onPointerMove(e: PointerEvent) {
  if (isDragging) {
    setFromPointer(e)
  }
}

function onPointerEnd() {
  isDragging = false
}

function onKeyDown(e: KeyboardEvent) {
  const moved = moveFocalPoint(point.value, e.key, e.shiftKey)
  if (moved) {
    // The arrows move the point, not the dialog's content.
    e.preventDefault()
    value.value = formatFocalPoint(moved)
  }
}
</script>
