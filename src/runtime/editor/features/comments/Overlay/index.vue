<template>
  <Teleport to="#bk-canvas-overlay">
    <div ref="overlay" class="bk bk-comments-overlay bk-control">
      <Item
        v-for="item in indicators"
        :key="item.id"
        v-bind="item"
        :is-reduced
        :is-left
        :show-comments="active === item.id"
        :width
        @toggle="toggle(item)"
        @add-comment="$emit('addComment', { body: $event, uuids: item.uuids })"
        @resolve-comment="$emit('resolveComment', $event)"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { falsy } from '#blokkli/helpers'
import { getBounds } from '#blokkli/editor/helpers/geometry'
import Item from './Item/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { CommentItem } from '../types'

type Indicator = {
  id: string
  comments: CommentItem[]
  uuids: string[]
  style: {
    transform: string
  }
}

const { eventBus, ui, dom } = useBlokkli()

const width = computed(() => {
  if (ui.viewport.value.width > 1600) {
    return 400
  } else if (ui.viewport.value.width > 1300) {
    return 350
  }

  return 300
})

const props = defineProps<{
  comments: CommentItem[]
}>()

defineEmits<{
  (e: 'addComment', data: { uuids: string[]; body: string }): void
  (e: 'resolveComment', uuid: string): void
}>()

const isReduced = ref(false)
const isLeft = ref(false)
const active = ref('')

function toggle(item: Indicator) {
  if (active.value === item.id) {
    active.value = ''
    eventBus.emit('select:end', [])
  } else {
    active.value = item.id
    eventBus.emit('select:end', item.uuids)
  }
}

const indicators = ref<Indicator[]>([])

onBlokkliEvent('canvas:draw', (e) => {
  const scale = e.artboardScale
  const offset = e.artboardOffset

  const x = Math.min(
    offset.x + ui.artboardSize.value.width * scale + 10,
    ui.visibleViewportPadded.value.x +
      ui.visibleViewportPadded.value.width -
      30,
  )
  isReduced.value = scale < 0.8
  isLeft.value =
    x + width.value <
    ui.visibleViewportPadded.value.x + ui.visibleViewportPadded.value.width

  const newIndicators: Record<string, Indicator> = {}
  const yMap = new Set<number>()

  const findY = (y: number): number => {
    if (yMap.has(y)) {
      return findY(y + 60)
    }
    yMap.add(y)
    return y
  }

  for (let i = 0; i < props.comments.length; i++) {
    const comment = props.comments[i]!
    const uuids = comment.blockUuids || []
    const rects = uuids
      .filter(falsy)
      .map((uuid) => {
        const blockRect = dom.getBlockRect(uuid)
        if (!blockRect) {
          return
        }

        const rect = ui.getViewportRelativeRect(blockRect)

        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          uuid,
        }
      })
      .filter(falsy)
    if (rects.length) {
      const bounds = getBounds(rects)
      const id = uuids.join(',')
      if (bounds) {
        if (!newIndicators[id]) {
          const y = findY(Math.round(bounds.y))
          newIndicators[id] = {
            id,
            comments: [comment],
            uuids,
            style: {
              // @TODO: Because the --bk-artboard-scale CSS variable was
              // removed, the comment box now scaled with the artboard.
              // This should be fixed by not positioning the box inside the
              // artboard element so it does not scale.
              transform: `translate(${x}px, ${y}px)`,
            },
          }
        } else {
          newIndicators[id].comments.push(comment)
        }
      }
    }
  }
  indicators.value = Object.values(newIndicators)
})
</script>
