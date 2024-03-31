<template>
  <Teleport to="body">
    <div class="bk bk-multi-select">
      <canvas ref="canvasEl" v-bind="canvasAttributes"></canvas>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { Coord, DraggableStyle, Rectangle } from '#blokkli/types'
import { intersects } from '#blokkli/helpers'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { getDefinition } from '#blokkli/definitions'

const { keyboard, eventBus, ui, dom, theme, runtimeConfig, selection } =
  useBlokkli()

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

const artboardOffsetStart = { ...ui.artboardOffset.value }
const artboardScaleStart = ui.artboardScale.value

const buildMultiSelectBlock = (uuid: string): MultiSelectBlock | undefined => {
  const el = document.querySelector(
    `[data-blokkli-provider-active="true"] [data-uuid="${uuid}"]`,
  )

  if (!(el instanceof HTMLElement)) {
    return
  }
  const dataset = el.dataset
  const itemBundle = dataset.itemBundle
  const hostType = dataset.hostType
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
      ? definition.editor.getDraggableElement(el)
      : el) || el
  if (!(element instanceof HTMLElement)) {
    return
  }
  return {
    uuid,
    isNested,
    element,
  }
}

type MultiSelectRect = {
  rect: DOMRect
  scale: number
  artboardOffset: Coord
}

const styleCache: Record<string, DraggableStyle> = {}
const rectCache: Record<string, MultiSelectRect> = {}
const blockCache: Record<string, MultiSelectBlock> = {}

const getDraggableStyle = (block: MultiSelectBlock): DraggableStyle => {
  if (styleCache[block.uuid]) {
    return styleCache[block.uuid]
  }
  const style = theme.getDraggableStyle(block.element)
  styleCache[block.uuid] = style
  return style
}

const getBlockRect = (block: MultiSelectBlock): MultiSelectRect => {
  if (rectCache[block.uuid]) {
    return rectCache[block.uuid]
  }
  const rect = block.element.getBoundingClientRect()
  rectCache[block.uuid] = {
    rect,
    scale: ui.artboardScale.value,
    artboardOffset: { ...ui.artboardOffset.value },
  }
  return rectCache[block.uuid]
}

const getBlock = (uuid: string): MultiSelectBlock | undefined => {
  if (blockCache[uuid]) {
    return blockCache[uuid]
  }

  const block = buildMultiSelectBlock(uuid)

  if (!block) {
    return
  }

  blockCache[uuid] = block

  return block
}

const props = defineProps<{
  startX: number
  startY: number
}>()

defineEmits<{
  (e: 'select', uuids: string[]): void
}>()

let selected: string[] = []

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
    width: ui.viewport.value.width,
    height: ui.viewport.value.height,
  }
})

// Collect the UUIDs that have become visible at least once during multi select.
const seenUuids: Set<string> = new Set()

onBlokkliEvent('animationFrame', (e) => {
  const artboardOffset = { ...ui.artboardOffset.value }
  const scale = ui.artboardScale.value
  const startX =
    (props.startX / artboardScaleStart +
      (ui.artboardOffset.value.x / scale -
        artboardOffsetStart.x / artboardScaleStart)) *
    scale

  const startY =
    (props.startY / artboardScaleStart +
      (ui.artboardOffset.value.y / scale -
        artboardOffsetStart.y / artboardScaleStart)) *
    scale

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
  const visibleUuids = dom.getVisibleBlocks()
  visibleUuids.forEach((v) => seenUuids.add(v))
  const uuids = Array.from(seenUuids)
  const newSelectable: SelectableElement[] = []

  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i]
    const block = getBlock(uuid)
    if (!block) {
      continue
    }
    const blockRect = getBlockRect(block)

    const rect: Rectangle = {
      x:
        (blockRect.rect.x / blockRect.scale +
          (artboardOffset.x / scale -
            blockRect.artboardOffset.x / blockRect.scale)) *
        scale,
      y:
        (blockRect.rect.y / blockRect.scale +
          (artboardOffset.y / scale -
            blockRect.artboardOffset.y / blockRect.scale)) *
        scale,
      width: (blockRect.rect.width / blockRect.scale) * scale,
      height: (blockRect.rect.height / blockRect.scale) * scale,
    }

    const isIntersecting = intersects(selectRect, rect)
    if (isIntersecting && block.isNested) {
      hasNested = true
    }

    // Skip blocks that are outside of the visible viewport and that are not
    // intersecting with the selection rectangle.
    if (!intersects(rect, ui.visibleViewportPadded.value) && !isIntersecting) {
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

  selected = newSelected
})

onMounted(() => {
  eventBus.emit('select:start')
})

onBeforeUnmount(() => {
  eventBus.emit('select:end', selected)
})
</script>
