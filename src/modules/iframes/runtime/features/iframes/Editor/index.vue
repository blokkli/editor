<template>
  <div class="flex h-full" @wheel.capture.stop>
    <!-- Preview area -->
    <div class="flex-1 min-w-0">
      <div
        v-if="iframeSrc"
        class="overflow-auto bg-mono-50 rounded p-20 h-full"
      >
        <div class="relative mx-auto" :style="{ width: containerWidth + 'px' }">
          <div class="border border-mono-200 overflow-hidden">
            <iframe
              :src="iframeSrc"
              class="overflow-hidden"
              scrolling="no"
              :style="{
                width: '100%',
                height: resolved.height + 'px',
                border: 'none',
                display: 'block',
                pointerEvents: isDragging ? 'none' : 'auto',
              }"
            />
          </div>

          <!-- Bottom resize handle -->
          <div
            class="flex items-center justify-center cursor-ns-resize bg-mono-200 hover:bg-accent-300"
            style="height: 8px"
            @pointerdown.prevent="onPointerDown('height', $event)"
          />

          <!-- Right resize handle -->
          <div
            class="absolute top-0 cursor-ew-resize bg-mono-200 hover:bg-accent-300"
            :style="{
              right: '-8px',
              width: '8px',
              height: '100%',
            }"
            @pointerdown.prevent="onPointerDown('width', $event)"
          />

          <!-- Corner resize handle -->
          <div
            class="absolute cursor-nwse-resize bg-mono-300 hover:bg-accent-400"
            :style="{
              right: '-8px',
              bottom: '0',
              width: '8px',
              height: '8px',
            }"
            @pointerdown.prevent="onPointerDown('both', $event)"
          />
        </div>
      </div>

      <div v-else class="text-mono-500 p-20 text-center">
        The block must be rendered on the page before iframe heights can be
        configured.
      </div>
    </div>

    <!-- Sidebar -->
    <div
      class="flex flex-col gap-15 border-l border-mono-200 p-15"
      style="width: 200px; flex-shrink: 0"
    >
      <!-- Current dimensions -->
      <div class="text-mono-500 font-mono text-center" style="font-size: 11px">
        {{ containerWidth }}px &times; {{ resolved.height }}px
      </div>

      <!-- Viewport presets -->
      <div class="flex flex-col gap-3">
        <div
          class="text-mono-500 font-mono"
          style="
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          "
        >
          Presets
        </div>
        <button
          v-for="(vp, key) in VIEWPORTS"
          :key="key"
          type="button"
          class="bk-button bk-scheme-mono bk-is-light bk-is-small"
          :class="{
            'bk-scheme-accent bk-is-dark': containerWidth === vp.width,
          }"
          @click="containerWidth = vp.width"
        >
          {{ vp.label }} ({{ vp.width }}px)
        </button>
      </div>

      <!-- Breakpoints list -->
      <div v-if="sortedEntries.length" class="flex flex-col gap-3">
        <div
          class="text-mono-500 font-mono"
          style="
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          "
        >
          Breakpoints
        </div>
        <div
          v-for="entry in sortedEntries"
          :key="entry.key"
          class="flex items-center gap-5 rounded px-5 cursor-pointer"
          :class="
            entry.key === resolved.widthKey
              ? 'bg-accent-100 text-accent-900'
              : 'hover:bg-mono-100'
          "
          style="height: 30px"
          @click="containerWidth = entry.width"
        >
          <span class="font-mono flex-1" style="font-size: 12px">
            {{ entry.width }}px &rarr; {{ entry.height }}px
          </span>
          <button
            type="button"
            class="text-mono-400 hover:text-red-normal"
            style="font-size: 14px; line-height: 1"
            @click.stop="deleteEntry(entry.key)"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, useBlokkli } from '#imports'
import type { IframeHeightMap } from '../../../types'
import { VIEWPORTS } from '#blokkli-build/iframes-config'

const props = defineProps<{
  data: IframeHeightMap | null
  uuid: string
  optionKey: string
}>()

const DEFAULT_HEIGHT = 400

const { directive } = useBlokkli()

const iframeSrc = computed(
  () => directive.getValueElement(props.uuid, 'iframe') || '',
)

// Initialize from existing data. If empty, seed from viewport presets.
const heights = ref<IframeHeightMap>(
  props.data && Object.keys(props.data).length > 0
    ? { ...props.data }
    : Object.values(VIEWPORTS).reduce<IframeHeightMap>((acc, vp) => {
        acc[String(vp.width)] = DEFAULT_HEIGHT
        return acc
      }, {}),
)

const firstViewport = Object.values(VIEWPORTS)[0]
const containerWidth = ref(firstViewport?.width ?? 375)

const sortedEntries = computed(() =>
  Object.entries(heights.value)
    .map(([w, h]) => ({ width: Number(w), height: h, key: w }))
    .filter((e) => !Number.isNaN(e.width))
    .sort((a, b) => a.width - b.width),
)

// Resolve which breakpoint is active at the current container width.
// Follows the same cascade as the generated container query CSS:
// the smallest breakpoint whose width >= containerWidth wins.
// If the container is wider than all breakpoints, the largest is the default.
const resolved = computed(() => {
  const sorted = sortedEntries.value
  if (!sorted.length) {
    return { height: DEFAULT_HEIGHT, widthKey: '' }
  }

  const match = sorted.find((bp) => bp.width >= containerWidth.value)
  if (match) {
    return { height: match.height, widthKey: match.key }
  }

  const largest = sorted[sorted.length - 1]!
  return { height: largest.height, widthKey: largest.key }
})

function deleteEntry(key: string) {
  const { [key]: _, ...rest } = heights.value
  heights.value = rest
}

// --- Drag-to-resize ---

type DragAxis = 'width' | 'height' | 'both'

const isDragging = ref(false)
let dragAxis: DragAxis = 'height'
let dragStartX = 0
let dragStartY = 0
let dragStartWidth = 0
let dragStartHeight = 0

function onPointerDown(axis: DragAxis, e: PointerEvent) {
  isDragging.value = true
  dragAxis = axis
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartWidth = containerWidth.value
  dragStartHeight = resolved.value.height
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (dragAxis === 'width' || dragAxis === 'both') {
    const deltaX = e.clientX - dragStartX
    // Double the delta because centering moves both edges equally.
    containerWidth.value = Math.max(
      200,
      Math.round(dragStartWidth + deltaX * 2),
    )
  }
  if (dragAxis === 'height' || dragAxis === 'both') {
    const deltaY = e.clientY - dragStartY
    const newHeight = Math.max(50, Math.round(dragStartHeight + deltaY))
    const widthKey = String(containerWidth.value)
    heights.value = { ...heights.value, [widthKey]: newHeight }
  }
}

function onPointerUp() {
  isDragging.value = false
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
}

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
})

function getData(): IframeHeightMap {
  return heights.value
}

defineExpose({ getData })
</script>
