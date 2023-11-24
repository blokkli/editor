<template>
  <Teleport to="body">
    <div class="pb pb-comments-overlay pb-control">
      <Item
        v-for="item in indicators"
        v-bind="item"
        @toggle="toggle(item.target)"
        @add-comment="$emit('addComment', { body: $event, uuid: item.target })"
        @resolve-comment="$emit('resolveComment', $event)"
        :is-reduced="isReduced"
        :is-left="isLeft"
        :show-comments="active === item.target"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { PbComment } from '../../../../../types'
import { falsy } from '../../../helpers'
import { AnimationFrameEvent } from '../../../types'
import Item from './Item/index.vue'

const { eventBus } = useParagraphsBuilderStore()

const props = defineProps<{
  comments: PbComment[]
}>()

defineEmits<{
  (e: 'addComment', data: { uuid: string; body: string }): void
  (e: 'resolveComment', id: string): void
}>()

const isReduced = ref(false)
const isLeft = ref(false)
const active = ref('')

function toggle(uuid: string) {
  if (active.value === uuid) {
    active.value = ''
  } else {
    active.value = uuid
  }
}

const grouped = computed(() => {
  const map = props.comments.reduce<Record<string, PbComment[]>>((acc, v) => {
    if (v.targetUuid) {
      if (!acc[v.targetUuid]) {
        acc[v.targetUuid] = []
      }
      acc[v.targetUuid].push(v)
    }
    return acc
  }, {})

  return Object.entries(map).map(([target, comments]) => {
    const el = document.querySelector(`[data-uuid="${target}"]`)
    return {
      target,
      comments,
      element: el && el instanceof HTMLElement ? el : null,
    }
  })
})

export type Indicator = {
  target: string
  comments: PbComment[]
  style: {
    transform: string
  }
}

const indicators = ref<Indicator[]>([])

function onAnimationFrame(e: AnimationFrameEvent) {
  const x = Math.min(
    e.canvasRect.x + e.canvasRect.width + 10,
    e.rootRect.x + e.rootRect.width - 60,
  )
  isReduced.value = e.scale < 0.8
  isLeft.value = x < e.rootRect.x + e.rootRect.width - 300
  indicators.value = grouped.value
    .map((v) => {
      const rect = e.rects[v.target]
      if (rect) {
        return {
          target: v.target,
          count: v.comments.length,
          comments: v.comments,
          style: {
            transform: `translate(${x}px, ${rect.y}px)`,
          },
        }
      }
    })
    .filter(falsy)
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
})

onBeforeUnmount(() => {
  eventBus.off('animationFrame', onAnimationFrame)
})
</script>
