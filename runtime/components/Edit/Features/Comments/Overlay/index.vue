<template>
  <Teleport to="body">
    <div class="pb pb-comments-overlay pb-control">
      <Item
        v-for="item in indicators"
        v-bind="item"
        @toggle="toggle(item)"
        @add-comment="$emit('addComment', { body: $event, uuids: item.uuids })"
        @resolve-comment="$emit('resolveComment', $event)"
        :is-reduced="isReduced"
        :is-left="isLeft"
        :show-comments="active === item.id"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import type { PbComment, AnimationFrameEvent } from '#pb/types'
import { getBounds } from '#pb/helpers'
import Item from './Item/index.vue'

const { eventBus } = useBlokkli()

const props = defineProps<{
  comments: PbComment[]
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

export type Indicator = {
  id: string
  comments: PbComment[]
  uuids: string[]
  style: {
    transform: string
    height: string
  }
}

const indicators = ref<Indicator[]>([])

function onAnimationFrame(e: AnimationFrameEvent) {
  const x = Math.min(
    e.canvasRect.x + e.canvasRect.width + 20,
    e.rootRect.x + e.rootRect.width - 60,
  )
  isReduced.value = e.scale < 0.8
  isLeft.value = x < e.rootRect.x + e.rootRect.width - 300

  const newIndicators: Record<string, Indicator> = {}
  const orphaned: PbComment[] = []
  const yMap = new Set<number>()

  const findY = (y: number): number => {
    if (yMap.has(y)) {
      return findY(y + 60)
    }
    yMap.add(y)
    return y
  }

  for (let i = 0; i < props.comments.length; i++) {
    const comment = props.comments[i]
    const uuids = comment.paragraphUuids || []
    const rects = uuids.map((uuid) => e.rects[uuid]).filter(Boolean)
    if (!rects.length) {
      orphaned.push(comment)
    } else {
      const bounds = getBounds(rects)
      const id = uuids.join(',')
      if (bounds) {
        if (!newIndicators[id]) {
          const y = findY(Math.round(bounds.top + window.scrollY))
          newIndicators[id] = {
            id,
            comments: [],
            uuids,
            style: {
              transform: `translate(${x}px, ${y}px)`,
              height: bounds.height + 'px',
            },
          }
        }
      }
      newIndicators[id].comments.push(comment)
    }
  }
  indicators.value = Object.values(newIndicators)
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
