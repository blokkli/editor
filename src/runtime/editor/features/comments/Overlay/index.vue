<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      ref="overlay"
      class="bk bk-comments-overlay bk-control fixed top-0 left-0 w-full h-full pointer-events-none z-comments-overlay"
    >
      <Item
        v-for="item in indicators"
        :key="item.id"
        v-bind="item"
        :is-reduced
        :is-left
        :show-comments="active === item.id"
        :width
        @toggle="toggle(item)"
        @reply="$emit('reply', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @resolve-comment="$emit('resolveComment', $event)"
        @unresolve-comment="$emit('unresolveComment', $event)"
        @toggle-task="$emit('toggleTask', $event)"
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
  roots: CommentItem[]
  replies: CommentItem[]
  uuids: string[]
  style: {
    transform: string
  }
}

const { eventBus, ui, dom } = useBlokkli()

const width = computed(() => {
  if (ui.viewport.value.width > 1600) {
    return 460
  } else if (ui.viewport.value.width > 1300) {
    return 400
  }

  return 320
})

const props = defineProps<{
  comments: CommentItem[]
}>()

defineEmits<{
  (e: 'reply', data: { parentUuid: string; body: string }): void
  (e: 'edit', data: { uuid: string; body: string }): void
  (e: 'toggleTask', data: { uuid: string; taskIndex: number }): void
  (e: 'delete' | 'resolveComment' | 'unresolveComment', uuid: string): void
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

const repliesByRoot = computed(() => {
  const map = new Map<string, CommentItem[]>()
  for (const comment of props.comments) {
    if (!comment.parentUuid) {
      continue
    }
    const list = map.get(comment.parentUuid) || []
    list.push(comment)
    map.set(comment.parentUuid, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => Date.parse(a.created) - Date.parse(b.created))
  }
  return map
})

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

  const roots = props.comments.filter((c) => !c.parentUuid)

  for (let i = 0; i < roots.length; i++) {
    const comment = roots[i]!
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
            roots: [comment],
            replies: repliesByRoot.value.get(comment.uuid) || [],
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
          newIndicators[id].roots.push(comment)
          const moreReplies = repliesByRoot.value.get(comment.uuid) || []
          newIndicators[id].replies.push(...moreReplies)
        }
      }
    }
  }
  indicators.value = Object.values(newIndicators)
})
</script>
