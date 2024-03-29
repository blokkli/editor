<template>
  <Teleport to=".bk-main-canvas">
    <div class="bk bk-comments-overlay bk-control">
      <Item
        v-for="item in indicators"
        :key="item.id"
        v-bind="item"
        :is-reduced="isReduced"
        :is-left="isLeft"
        :show-comments="active === item.id"
        @toggle="toggle(item)"
        @add-comment="$emit('addComment', { body: $event, uuids: item.uuids })"
        @resolve-comment="$emit('resolveComment', $event)"
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import type { CommentItem } from '#blokkli/types'
import { falsy, getBounds } from '#blokkli/helpers'
import Item from './Item/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { eventBus, ui, dom } = useBlokkli()

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

type Indicator = {
  id: string
  comments: CommentItem[]
  uuids: string[]
  style: {
    transform: string
  }
}

const indicators = ref<Indicator[]>([])

onBlokkliEvent('animationFrame', (e) => {
  const scale = ui.getArtboardScale()
  const artboardEl = ui.artboardElement()
  const artboardRect = artboardEl.getBoundingClientRect()
  const artboardScroll = artboardEl.scrollTop

  const x = Math.min(artboardRect.width / scale + 10, window.innerWidth - 54)
  isReduced.value = e.scale < 0.8
  isLeft.value =
    x * scale + artboardRect.x + 300 <
    ui.visibleViewportPadded.value.x + ui.visibleViewportPadded.value.width

  const newIndicators: Record<string, Indicator> = {}
  const orphaned: CommentItem[] = []
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
    const uuids = comment.blockUuids || []
    const rects = uuids
      .map((uuid) => dom.findBlock(uuid))
      .filter(falsy)
      .map((block) => {
        const rect = block.element().getBoundingClientRect()

        return {
          x: (rect.x - artboardRect.x) / scale,
          y: (rect.y - artboardRect.y) / scale - +artboardScroll,
          width: rect.width / scale,
          height: rect.height / scale,
          uuid: block.uuid,
        }
      })
    if (!rects.length) {
      orphaned.push(comment)
    } else {
      const bounds = getBounds(rects)
      const id = uuids.join(',')
      if (bounds) {
        if (!newIndicators[id]) {
          const y = findY(Math.round(bounds.y + artboardScroll))
          newIndicators[id] = {
            id,
            comments: [],
            uuids,
            style: {
              // @TODO: Because the --bk-artboard-scale CSS variable was
              // removed, the comment box now scaled with the artboard.
              // This should be fixed by not positioning the box inside the
              // artboard element so it does not scale.
              transform: `translate(${x}px, ${y}px)`,
            },
          }
        }
      }
      newIndicators[id].comments.push(comment)
    }
  }
  indicators.value = Object.values(newIndicators)
})
</script>
