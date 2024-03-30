<template>
  <Teleport to="body">
    <div class="bk bk-multi-select">
      <canvas ref="canvasEl" v-bind="canvasAttributes"></canvas>
    </div>
  </Teleport>
  <Teleport to=".bk-main-canvas">
    <div
      ref="anchor"
      class="bk-multi-select-anchor"
      :style="{ top: anchorY + 'px', left: anchorX + 'px' }"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { DraggableStyle, Rectangle } from '#blokkli/types'
import { falsy, intersects } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { getDefinition } from '#blokkli/definitions'

const { keyboard, eventBus, ui, dom, theme, runtimeConfig } = useBlokkli()

const canvasEl = ref<HTMLCanvasElement | null>(null)

type SelectableElement = {
  uuid: string
  nested: boolean
  rect: Rectangle
  isIntersecting: boolean
  style: DraggableStyle
}

type MultiSelectBlock = {
  uuid: string
  isNested: boolean
  element: HTMLElement | SVGElement
}

const styleCache: Record<string, DraggableStyle> = {}

const getDraggableStyle = (block: MultiSelectBlock): DraggableStyle => {
  if (styleCache[block.uuid]) {
    return styleCache[block.uuid]
  }
  const style = theme.getDraggableStyle(block.element)
  styleCache[block.uuid] = style
  return style
}

const props = defineProps<{
  startX: number
  startY: number
}>()

defineEmits<{
  (e: 'select', uuids: string[]): void
}>()

const anchorX = ref(0)
const anchorY = ref(0)
const anchor = ref<HTMLDivElement | null>(null)
const scrollY = ref(0)

const selected = ref<string[]>([])
const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)

const getAnchorRect = () => {
  if (!anchor.value) {
    return { x: 0, y: 0 }
  }
  const rect = anchor.value.getBoundingClientRect()
  return {
    x: rect.x,
    y: rect.y,
  }
}

const rgba = (rgb: [number, number, number], a = 1) =>
  `rgba(${rgb.join(',')},${a})`

const themeColors = computed(() => {
  return {
    selectRectBg: 'rgba(255,255,255,0.8)',
    selectRectFg: rgba(theme.mono.value[700], 0.8),
  }
})

const canvasAttributes = computed(() => {
  return {
    width: viewportWidth.value,
    height: viewportHeight.value,
  }
})

const blocks = computed<MultiSelectBlock[]>(() =>
  [
    ...document.querySelectorAll(
      '[data-blokkli-provider-active="true"] [data-uuid]',
    ),
  ]
    .map((block) => {
      if (!(block instanceof HTMLElement)) {
        return
      }
      const dataset = block.dataset
      const itemBundle = dataset.itemBundle
      const hostType = dataset.hostType
      const uuid = dataset.uuid
      if (!itemBundle || !uuid) {
        return
      }
      const definition = getDefinition(itemBundle)
      if (!definition) {
        return
      }
      const isNested = hostType === runtimeConfig.itemEntityType
      const element =
        (definition.editor?.getDraggableElement
          ? definition.editor.getDraggableElement(block)
          : block) || block
      if (!(element instanceof HTMLElement)) {
        return
      }
      return {
        uuid,
        isNested,
        element,
      }
    })
    .filter(falsy),
)

onBlokkliEvent('animationFrame', (e) => {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
  const anchorRect = getAnchorRect()
  const startX = anchorRect.x
  const startY = anchorRect.y

  scrollY.value = window.scrollY

  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) {
    return
  }
  const ax = startX > e.mouseX ? e.mouseX : startX
  const ay = startY > e.mouseY ? e.mouseY : startY
  const bx = startX > e.mouseX ? startX : e.mouseX
  const by = startY > e.mouseY ? startY : e.mouseY
  const selectRect = {
    x: ax,
    y: ay,
    width: bx - ax,
    height: by - ay,
  }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  ctx.lineWidth = 2
  ctx.lineDashOffset = 0

  const newSelected: string[] = []

  let hasNested = false
  const newSelectable: SelectableElement[] = []
  for (let i = 0; i < blocks.value.length; i++) {
    const block = blocks.value[i]
    const rect = block.element.getBoundingClientRect()

    const isIntersecting = intersects(selectRect, rect)
    if (isIntersecting && block.isNested) {
      hasNested = true
    }

    if (!intersects(rect, ui.visibleViewportPadded.value)) {
      continue
    }
    newSelectable.push({
      uuid: block.uuid,
      nested: block.isNested,
      rect,
      isIntersecting,
      style: getDraggableStyle(block),
    })
  }

  for (let i = 0; i < newSelectable.length; i++) {
    const block = newSelectable[i]
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.fillStyle = block.style.contrastColorTranslucent
    ctx.strokeStyle = block.style.contrastColor

    if (
      (hasNested &&
        !keyboard.isPressingControl.value &&
        block.isIntersecting &&
        block.nested) ||
      ((!hasNested || keyboard.isPressingControl.value) && block.isIntersecting)
    ) {
      ctx.setLineDash([])
      ctx.roundRect(
        block.rect.x,
        block.rect.y,
        block.rect.width,
        block.rect.height,
        block.style.radius,
      )
      ctx.fill()
      newSelected.push(block.uuid)
    }
    ctx.roundRect(
      block.rect.x,
      block.rect.y,
      block.rect.width,
      block.rect.height,
      block.style.radius,
    )
    ctx.stroke()
  }

  ctx.lineWidth = 2
  ctx.strokeStyle = themeColors.value.selectRectBg
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.rect(ax, ay, bx - ax, by - ay)
  ctx.stroke()

  ctx.lineDashOffset = Math.round(Date.now() / 10) % 10
  ctx.strokeStyle = themeColors.value.selectRectFg
  ctx.beginPath()
  ctx.setLineDash([5, 5])
  ctx.rect(ax, ay, bx - ax, by - ay)
  ctx.stroke()

  selected.value = newSelected
})

onMounted(() => {
  const artboard = ui.artboardElement()
  const artboardRect = artboard.getBoundingClientRect()
  const scale = ui.getArtboardScale()
  const newX = props.startX
  const newY = props.startY
  anchorX.value = (newX - artboardRect.left) / scale
  anchorY.value = (newY - artboardRect.top) / scale

  eventBus.emit('select:start')
})

onBeforeUnmount(() => {
  eventBus.emit('select:end', selected.value)
})
</script>
